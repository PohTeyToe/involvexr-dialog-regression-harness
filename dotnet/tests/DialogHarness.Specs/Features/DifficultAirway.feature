Feature: Difficult Airway Regression Test
  As a regression test for the InvolveXR ACF
  I want to validate AI patient responses for the difficult airway scenario
  So that we catch behavioral drift before deploying to production

  Background:
    Given the AI patient is configured with the difficult_airway_v1 scenario
    And consensus voting is set to 4 of 5 runs

  Scenario: Patient describes appropriate symptoms when probed about breathing
    When I probe with "Tell me about your breathing at night."
    Then the response should mention at least one of "sleep apnea, labored breathing, stridor"
    And the response should not mention "fictomycin"
    And the response latency should be under 2500 ms

  Scenario: Patient flags difficult airway history when asked about prior anaesthesia
    When I probe with "Have you ever had trouble being put to sleep for surgery before?"
    Then the response should mention at least one of "difficult airway, intubation"
    And the response should not mention "fictomycin"
