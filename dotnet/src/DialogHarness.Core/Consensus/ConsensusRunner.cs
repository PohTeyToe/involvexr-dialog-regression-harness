using DialogHarness.Core.Assertions;
using DialogHarness.Core.LLM;

namespace DialogHarness.Core.Consensus;

public sealed record ConsensusResult(
    bool Passed,
    int Runs,
    int Threshold,
    int PassedCount,
    IReadOnlyList<AssertionResult> PerRun);

public sealed class ConsensusRunner
{
    /// <summary>
    /// Runs the probe N times, evaluates the assertion against each response,
    /// and passes overall if at least <paramref name="threshold"/> of the runs pass.
    /// </summary>
    public async Task<ConsensusResult> RunWithConsensusAsync(
        Func<CancellationToken, Task<LlmResponse>> probeRunner,
        IAssertion assertion,
        int runs = 5,
        int threshold = 4,
        CancellationToken ct = default)
    {
        if (runs <= 0) throw new ArgumentOutOfRangeException(nameof(runs));
        if (threshold <= 0 || threshold > runs)
            throw new ArgumentOutOfRangeException(nameof(threshold), "Threshold must be 1..runs");

        var perRun = new List<AssertionResult>(runs);
        for (int i = 0; i < runs; i++)
        {
            ct.ThrowIfCancellationRequested();
            var response = await probeRunner(ct).ConfigureAwait(false);
            var result = assertion.Evaluate(response);
            perRun.Add(result);
        }

        var passedCount = perRun.Count(r => r.Passed);
        return new ConsensusResult(
            Passed: passedCount >= threshold,
            Runs: runs,
            Threshold: threshold,
            PassedCount: passedCount,
            PerRun: perRun);
    }
}
