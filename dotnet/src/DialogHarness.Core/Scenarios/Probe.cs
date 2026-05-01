using YamlDotNet.Serialization;

namespace DialogHarness.Core.Scenarios;

public sealed class Probe
{
    [YamlMember(Alias = "prompt")]
    public string Prompt { get; set; } = string.Empty;

    [YamlMember(Alias = "must_mention")]
    public List<string> MustMention { get; set; } = new();

    [YamlMember(Alias = "must_not_mention")]
    public List<string> MustNotMention { get; set; } = new();

    [YamlMember(Alias = "persona_check")]
    public bool PersonaCheck { get; set; }
}
