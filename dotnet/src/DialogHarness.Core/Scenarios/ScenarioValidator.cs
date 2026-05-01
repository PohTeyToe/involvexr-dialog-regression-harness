using FluentValidation;

namespace DialogHarness.Core.Scenarios;

public sealed class ScenarioValidator : AbstractValidator<Scenario>
{
    public ScenarioValidator()
    {
        RuleFor(s => s.Id).NotEmpty();
        RuleFor(s => s.Title).NotEmpty();
        RuleFor(s => s.Patient).NotEmpty();
        RuleFor(s => s.LatencyBudgetMs).GreaterThan(0).LessThanOrEqualTo(60_000);
        RuleFor(s => s.Probes).NotEmpty();
        RuleForEach(s => s.Probes).SetValidator(new ProbeValidator());
        RuleFor(s => s.Languages).NotEmpty();
    }
}

public sealed class ProbeValidator : AbstractValidator<Probe>
{
    public ProbeValidator()
    {
        RuleFor(p => p.Prompt).NotEmpty();
        RuleFor(p => p.MustMention).NotNull();
        RuleFor(p => p.MustNotMention).NotNull();
    }
}
