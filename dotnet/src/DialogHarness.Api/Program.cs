using DialogHarness.Api.Endpoints;
using DialogHarness.Api.Validators;
using DialogHarness.Core.Embeddings;
using DialogHarness.Core.LLM;
using DialogHarness.Core.Scenarios;
using FluentValidation;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<ScenarioLoader>();
builder.Services.AddSingleton<IEmbeddingProvider>(_ => new HashingEmbeddingProvider(256));
builder.Services.AddSingleton<ILLMClient>(_ => new MockLLMClient(scriptedResponses: new()
{
    ["breath"] = "I have labored breathing and some stridor at night, doctor.",
    ["sleep"] = "Yes, I've been told I have sleep apnea, my wife says I stop breathing.",
    ["intubation"] = "They had a difficult airway last time and almost couldn't tube me.",
    ["news"] = "Please be honest with me about the diagnosis.",
    ["pediatric"] = "The child is unresponsive, no pulse, beginning compressions."
}));
builder.Services.AddValidatorsFromAssemblyContaining<RunRequestValidator>();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.MapHealthEndpoints();
app.MapScenarioEndpoints();
app.MapRunEndpoints();

app.Run();

// Marker type for WebApplicationFactory<Program>
public partial class Program;
