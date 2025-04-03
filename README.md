# MelonLoader.VSCode.Wizard

This extension is designed to simplify and streamline the process of creating mods for Unity games using [MelonLoader](https://melonwiki.xyz/). Inspired by tools like [MelonLoader.VSWizard](https://github.com/TrevTV/MelonLoader.VSWizard). Whether you're working with IL2CPP or Mono games, this tool automates the setup of your modding environment.

## What Does It Do?

This extension takes care of all the tedious setup tasks involved in MelonLoader modding:
- Generating the required boilerplate code (`MelonMod`, `MelonInfo`, and `MelonGame`).
- Referencing essential assemblies for mod development, including MelonLoader, Harmony, and IL2CPP proxy assemblies.
- Adapting to different MelonLoader.
- Supporting both IL2CPP and Mono games.

## Usage

1. **Install the Extension**:
   - Download the extension from the [Visual Studio Code Marketplace]().
   - Alternatively, download it from the [Releases](https://github.com/MasterMaybeFromHell/MelonLoader.VSCode.Wizard/releases) tab.
2. **Create a New Mod Project**:
   - Open the Command Palette (`Ctrl+Shift+P`) in Visual Studio Code.
   - Type **"Start MelonLoader Wizard"**.
3. **Follow the Prompts**:
   - Select the Unity game executable.
   - Enter your mod's name and choose its location.
   - The extension will generate the project and open it in a new VSCode window.

## Licensing

This project incorporates elements inspired by [MelonLoader.VSWizard](https://github.com/TrevTV/MelonLoader.VSWizard) but has been reimagined for Visual Studio Code users. Licensing details are as follows:

- **MelonLoader**: Licensed under the [Apache License, Version 2.0](https://github.com/LavaGang/MelonLoader/blob/master/LICENSE.md).
- **This Extension**: Licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
