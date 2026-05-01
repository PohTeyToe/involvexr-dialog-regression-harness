namespace DialogHarness.Api.Endpoints;

public static class HealthEndpoint
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", () => Results.Ok(new
        {
            status = "ok",
            service = "DialogHarness.Api",
            version = "1.0.0"
        })).WithName("Health");

        return app;
    }
}
