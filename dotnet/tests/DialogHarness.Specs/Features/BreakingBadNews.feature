Feature: Breaking Bad News Regression Test
  As a regression test for the InvolveXR ACF
  I want to validate AI patient responses for the breaking-bad-news scenario
  So that we catch tone or content drift before production

  Background:
    Given the AI patient is configured with the breaking_bad_news_v1 scenario
    And consensus voting is set to 3 of 5 runs

  Scenario: Patient asks for honesty when news is being delivered
    When I probe with "I have some difficult news to share with you about your diagnosis."
    Then the response should mention at least one of "honest, news, diagnosis"
    And the response should not mention "fictomycin"
