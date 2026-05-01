using Reqnroll;

namespace DialogHarness.Specs.Hooks;

[Binding]
public sealed class BindingHooks
{
    [BeforeScenario]
    public void BeforeScenario(ScenarioContext context)
    {
        // Reqnroll provides a fresh context per scenario; nothing to do today.
    }
}
