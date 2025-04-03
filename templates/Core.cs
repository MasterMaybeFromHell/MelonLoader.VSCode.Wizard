using MelonLoader;

[assembly: MelonInfo(typeof($NAMESPACE$.Core), "$MOD_NAME$", "1.0.0", "$AUTHOR$", null)]
[assembly: MelonGame("$GAME_DEV$", "$GAME_NAME$")]

namespace $NAMESPACE$
{
    public class Core : MelonMod
    {
        public override void $INIT_METHOD_NAME$()
        {
            LoggerInstance.Msg("Initialized.");
        }
    }
}