using DialogHarness.Core.LLM;

namespace DialogHarness.Core.Assertions;

/// <summary>
/// Stateful: collects latencies across multiple Evaluate() calls and asserts
/// p95 below the configured ceiling. Use one instance per probe-run series.
/// </summary>
public sealed class LatencyBudgetAssertion : IAssertion
{
    private readonly long _budgetMs;
    private readonly List<long> _samples = new();

    public LatencyBudgetAssertion(long budgetMs)
    {
        if (budgetMs <= 0) throw new ArgumentOutOfRangeException(nameof(budgetMs));
        _budgetMs = budgetMs;
    }

    public string Name => "LatencyBudget";

    public AssertionResult Evaluate(LlmResponse response)
    {
        _samples.Add(response.LatencyMs);
        var p95 = ComputeP95(_samples);
        var passed = p95 <= _budgetMs;
        return new AssertionResult(
            passed, Name,
            passed
                ? $"p95={p95}ms within {_budgetMs}ms budget (n={_samples.Count})"
                : $"p95={p95}ms exceeds {_budgetMs}ms budget (n={_samples.Count})",
            passed ? 1.0 : (double)_budgetMs / Math.Max(p95, 1),
            new Dictionary<string, object>
            {
                ["p95Ms"] = p95,
                ["budgetMs"] = _budgetMs,
                ["sampleCount"] = _samples.Count
            });
    }

    public IReadOnlyList<long> Samples => _samples;

    private static long ComputeP95(IReadOnlyList<long> values)
    {
        if (values.Count == 0) return 0;
        var sorted = values.OrderBy(v => v).ToArray();
        var idx = (int)Math.Ceiling(0.95 * sorted.Length) - 1;
        if (idx < 0) idx = 0;
        if (idx >= sorted.Length) idx = sorted.Length - 1;
        return sorted[idx];
    }
}
