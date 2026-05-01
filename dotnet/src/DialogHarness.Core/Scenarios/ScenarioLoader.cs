using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace DialogHarness.Core.Scenarios;

public sealed class ScenarioLoader
{
    private readonly IDeserializer _deserializer;

    public ScenarioLoader()
    {
        _deserializer = new DeserializerBuilder()
            .WithNamingConvention(UnderscoredNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();
    }

    public Scenario LoadFromString(string yaml)
    {
        if (string.IsNullOrWhiteSpace(yaml))
        {
            throw new ArgumentException("YAML content is empty", nameof(yaml));
        }

        return _deserializer.Deserialize<Scenario>(yaml)
               ?? throw new InvalidOperationException("Failed to deserialize scenario");
    }

    public async Task<Scenario> LoadFromFileAsync(string path, CancellationToken ct = default)
    {
        var content = await File.ReadAllTextAsync(path, ct).ConfigureAwait(false);
        return LoadFromString(content);
    }

    public async Task<IReadOnlyList<Scenario>> LoadAllFromDirectoryAsync(string directory, CancellationToken ct = default)
    {
        if (!Directory.Exists(directory))
        {
            return Array.Empty<Scenario>();
        }

        var files = Directory.GetFiles(directory, "*.yaml")
            .Concat(Directory.GetFiles(directory, "*.yml"))
            .ToArray();

        var scenarios = new List<Scenario>(files.Length);
        foreach (var file in files)
        {
            scenarios.Add(await LoadFromFileAsync(file, ct).ConfigureAwait(false));
        }
        return scenarios;
    }
}
