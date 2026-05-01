using DialogHarness.Api.Models;
using FluentValidation;

namespace DialogHarness.Api.Validators;

public sealed class RunRequestValidator : AbstractValidator<RunRequest>
{
    public RunRequestValidator()
    {
        RuleFor(r => r.ScenarioId).NotEmpty().MaximumLength(120);
        RuleFor(r => r.ConsensusRuns)
            .InclusiveBetween(1, 11)
            .WithMessage("ConsensusRuns must be between 1 and 11");
        RuleFor(r => r.ConsensusThreshold)
            .GreaterThan(0)
            .LessThanOrEqualTo(r => r.ConsensusRuns)
            .WithMessage("ConsensusThreshold must be 1..ConsensusRuns");
        RuleFor(r => r.Language)
            .NotEmpty()
            .Matches("^[a-z]{2}(-[A-Z]{2})?$")
            .WithMessage("Language must be ISO 639-1 (e.g. en, fr, es-MX)");
    }
}
