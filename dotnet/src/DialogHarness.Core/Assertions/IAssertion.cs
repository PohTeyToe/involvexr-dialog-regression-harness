using DialogHarness.Core.LLM;

namespace DialogHarness.Core.Assertions;

public sealed record AssertionResult(
    bool Passed,
    string AssertionName,
    string Message,
    double Score = 1.0,
    IReadOnlyDictionary<string, object>? Diagnostics = null);

public interface IAssertion
{
    string Name { get; }
    AssertionResult Evaluate(LlmResponse response);
}
