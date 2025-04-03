import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';

interface GameInfo {
    Path: string;
    DataPath: string;
    ExePath: string;
    IsUnityGame: boolean;
    HasMelonInstalled: boolean;
    IsIl2Cpp: boolean;
    MelonVersion: string;
    GameDeveloper?: string;
    GameName?: string;
    IsMelon6Plus?: boolean;
}

function parseVersion(versionStr: string): { major: number, minor: number, patch: number } {
    const parts = versionStr.split('.').map(num => parseInt(num, 10) || 0);

    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0
    };
}

function versionToString(major: number, minor: number, patch: number) : string
{
    return `${major}.${minor}.${patch}`;
}

function compareVersions(v1: string, v2: string): number {
    const [major1, minor1, patch1] = v1.split('.').map(Number);
    const [major2, minor2, patch2] = v2.split('.').map(Number);

    return (major1 - major2) || (minor1 - minor2) || (patch1 - patch2);
}

function getDllVersion(dllPath: string): string {
    try {
        const command = `powershell "(Get-Item '${dllPath}').VersionInfo.FileVersion"`;

        return childProcess.execSync(command).toString().trim() || "0.0.0";
    } catch (error) {
        console.error("Error getting DLL version:", error);

        return "0.0.0";
    }
}

function getGameInfo(exePath: string): GameInfo {
    const gameDir = path.dirname(exePath);
    const dataDir = path.join(gameDir, `${path.basename(exePath, '.exe')}_Data`);

    if (!fs.existsSync(dataDir)) {
        throw new Error('Selected path does not contain a Unity game Data folder.');
    }

    const melonLoaderPath = path.join(gameDir, 'MelonLoader');

    if (!fs.existsSync(melonLoaderPath)) {
        throw new Error('MelonLoader is not installed in the selected game directory.');
    }

    const isIl2Cpp = fs.existsSync(path.join(dataDir, 'il2cpp_data', 'Metadata', 'global-metadata.dat'));
    const versionFile = isIl2Cpp ? path.join(melonLoaderPath, "\\net6", 'MelonLoader.dll') : path.join(melonLoaderPath, "\\net35", 'MelonLoader.dll');
    let melonVersion = parseVersion(getDllVersion(versionFile));
    const isMelon6Plus = melonVersion >= parseVersion('0.6.0');

    let gameDeveloper = 'Unknown Developer';
    let gameName = 'Unknown Game';

    const appInfoPath = path.join(dataDir, 'app.info');

    if (fs.existsSync(appInfoPath)) {
        const lines = fs.readFileSync(appInfoPath, 'utf-8').split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length >= 2) {
            gameDeveloper = lines[0];
            gameName = lines[1];
        }
    }

    return {
        Path: gameDir,
        DataPath: dataDir,
        ExePath: exePath,
        IsUnityGame: true,
        HasMelonInstalled: true,
        IsIl2Cpp: isIl2Cpp,
        MelonVersion: versionToString(melonVersion.major, melonVersion.minor, melonVersion.patch),
        GameDeveloper: gameDeveloper,
        GameName: gameName,
        IsMelon6Plus: isMelon6Plus
    };
}

function isBlacklistedReference(fileName: string): boolean {
    return ["mscorlib.dll", "netstandard.dll", "Mono.Security.dll"].includes(fileName) ||
           fileName.startsWith("System");
}

function getMelonLoaderReferences(info: GameInfo): string[] {
    const basePath = path.join(info.Path, "MelonLoader");
    const frameworkDir = info.IsIl2Cpp ? "net6" : "net35";
    const files: string[] = [];

    if (compareVersions(info.MelonVersion, "0.5.3") <= 0) {
        files.push(path.join(basePath, "MelonLoader.dll"));
    } else if (compareVersions(info.MelonVersion, "0.5.7") <= 0) {
        files.push(
            path.join(basePath, "MelonLoader.dll"),
            path.join(basePath, "0Harmony.dll")
        );
    } else {
        files.push(
            path.join(basePath, frameworkDir, "MelonLoader.dll"),
            path.join(basePath, frameworkDir, "0Harmony.dll")
        );

        if (info.IsIl2Cpp) {
            files.push(
                path.join(basePath, "net6", "Il2CppInterop.Runtime.dll"),
                path.join(basePath, "net6", "Il2CppInterop.Common.dll")
            );
        }
    }

    if (!info.IsIl2Cpp) {
        files.push(path.join(basePath, info.IsMelon6Plus ? "net35" : "", "ValueTupleBridge.dll"));
    }

    return files.filter(fs.existsSync);
}

function getProjectReferences(dllDir: string): string[] {
    return fs.readdirSync(dllDir)
        .filter(file => file.endsWith('.dll') && !isBlacklistedReference(file))
        .map(file => path.join(dllDir, file));
}

function generateReferences(info: GameInfo): string {
    const il2cppDllDir = info.IsMelon6Plus 
        ? path.join(info.Path, "MelonLoader", "Il2CppAssemblies") 
        : path.join(info.Path, "MelonLoader", "Managed");
    const dllDir = info.IsIl2Cpp ? il2cppDllDir : path.join(info.DataPath, "Managed");
    const allReferences = [...getMelonLoaderReferences(info), ...getProjectReferences(dllDir)];

    return allReferences.map(ref => 
        `\t\t<Reference Include="${path.basename(ref, '.dll')}">\n` +
        `\t\t\t<HintPath>${ref}</HintPath>\n` +
        `\t\t</Reference>`
    ).join('\n');
}

function replacePlaceholders(content: string, replacements: Record<string, string>): string {
    return content.replace(/\$(\w+)\$/g, (_, key) => {
        const value = replacements[key];

        if (!value) {
            vscode.window.showInformationMessage(`Replacement for key "${key}" not found.`);
        }
        
        return value || '';
    });
}

function copyTemplate(templatePath: string, projectPath: string, replacements: Record<string, string>) {
    fs.cpSync(templatePath, projectPath, { recursive: true });

    const files = getAllFiles(projectPath);

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const updatedContent = replacePlaceholders(content, replacements);
        fs.writeFileSync(file, updatedContent, 'utf8');

        if (file.includes('MyMod')) {
            const newFileName = file.replace('MyMod', replacements['MOD_NAME']);
            fs.renameSync(file, newFileName);
        }
    });
}

function getAllFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...getAllFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    });

    return files;
}

function openInVSCode(projectPath: string) {
    try {
        const uri = vscode.Uri.file(projectPath);
        vscode.commands.executeCommand('vscode.openFolder', uri);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open project in VSCode: ${error}`);
    }
}

export async function createProject(context: vscode.ExtensionContext) {
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        filters: {
            'Unity Executables': ['exe']
        },
        title: 'Select Game Executable'
    };

    const fileUri = await vscode.window.showOpenDialog(options);

    if (!fileUri || fileUri.length === 0) {
        throw new Error('No executable file selected.');
    }

    const exePath = fileUri[0].fsPath;
    const gameInfo = getGameInfo(exePath);

    const modName = await vscode.window.showInputBox({
        title: 'Enter Mod Name',
        placeHolder: 'MyAwesomeMod',
        prompt: 'Enter the name of your mod (e.g., MyAwesomeMod)',
        validateInput: (value) => {
            if (!value.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                return 'Invalid name. Use only letters, numbers, and underscores.';
            }
            
            return null;
        }
    });

    if (!modName) {
        throw new Error('Mod name is required.');
    }

    const openOptions: vscode.OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select Project Location',
        openLabel: 'Select Folder'
    };

    const folderUri = await vscode.window.showOpenDialog(openOptions);

    if (!folderUri || folderUri.length === 0) {
        throw new Error('No project location selected.');
    }

    const selectedFolder = folderUri[0].fsPath;
    const projectPath = path.join(selectedFolder, modName);
    const templatePath = path.join(context.extensionPath, 'templates');

    const replacements: Record<string, string> = {
        'GAME_DIR': gameInfo.Path,
        'GAME_DEV': gameInfo.GameDeveloper || 'null',
        'GAME_NAME': gameInfo.GameName || 'null',
        'FRAMEWORK_VER': gameInfo.IsIl2Cpp ? 'net6.0' : 'net35',
        'AUTHOR': process.env.USERNAME || 'Unknown',
        'PROJ_REFERENCES': generateReferences(gameInfo),
        'INIT_METHOD_NAME': gameInfo.MelonVersion >= '0.5.5' ? 'OnInitializeMelon' : 'OnApplicationStart',
        'IMPLICIT_USINGS': gameInfo.MelonVersion >= '0.5.5' ? 'enable' : 'disable',
        'MOD_NAME': modName,
        'NAMESPACE': modName
    };
    
    copyTemplate(templatePath, projectPath, replacements);

    vscode.window.showInformationMessage(`Project created successfully at ${projectPath}`);

    openInVSCode(projectPath);
}