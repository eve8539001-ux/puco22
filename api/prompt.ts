export const snPromptTemplate = `You are an AI that matches a given user scenario to the triggered sensor capabilities of a smart projector robot.
The robot has an RGB camera and a ToF distance sensor. They can trigger simultaneously or individually depending on the situation.
Analyze the user's situation and return 0 to 2 Sensor (SN) capability codes that are most likely triggered.

CRITICAL RULE: 각 카테고리(SN, MP, PJ, SP)는 이 상황에서 실제로 관련이 있을 때만 항목을 선택해라. 관련 없는 카테고리는 빈 배열로 남겨도 된다. 무조건 채우려고 억지로 갖다 붙이지 마라. 반대로 한 카테고리 안에서 여러 하위 코드가 동시에 타당하면 최대 3개까지 함께 선택해도 된다. 개수는 오직 상황 맥락으로만 판단해라.

Available SN Capabilities:
{SN_LIST}

Return ONLY valid JSON matching exactly this schema:
{
  "triggered": [
    {
      "code": "SN-XXX",
      "reason": "Why this sensor is triggered in this situation"
    }
  ]
}`;

export const reactionPromptTemplate = `You are an AI that determines a smart projector robot's reactions based on a user scenario and the already triggered sensor (SN) capabilities.
The robot reacts using Motion (MP), Projection (PJ), and Speaker (SP) capabilities.
CRITICAL RULE 1: 센서(SN)가 감지한 트리거가 원인이고, 모션/프로젝션/스피커는 그 트리거에 대한 반응이다. 이 인과관계를 반영해서, 이미 판단한 SN 트리거와 논리적으로 이어지는 MP/PJ/SP 조합을 선택해라. SN과 무관하게 MP/PJ/SP를 독립적으로 고르지 마라.
CRITICAL RULE 2: 각 카테고리(SN, MP, PJ, SP)는 이 상황에서 실제로 관련이 있을 때만 항목을 선택해라. 관련 없는 카테고리는 빈 배열로 남겨도 된다. 무조건 채우려고 억지로 갖다 붙이지 마라. 반대로 한 카테고리 안에서 여러 하위 코드가 동시에 타당하면 최대 3개까지 함께 선택해도 된다. 개수는 오직 상황 맥락으로만 판단해라.

Available MP Capabilities:
{MP_LIST}

Available PJ Capabilities:
{PJ_LIST}

Available SP Capabilities:
{SP_LIST}

Instructions:
- Select 0 to 3 capability codes for each category (MP, PJ, SP).
- Only use exactly the codes provided in the lists. Do NOT invent codes.
- Provide a reason of about 25 characters for each selected item.
- Provide a summary of about 40 characters.
- Provide an activationSummary of about 15 characters explaining which categories are active and why the rest are empty.
- If the scenario is missing user intent or is too ambiguous, set missingIntent to true and explain in intentNote.

Return ONLY valid JSON matching exactly this schema:
{
  "summary": "Overall summary (around 40 chars)",
  "activationSummary": "e.g., 센서·모션만 반응, 투사·음성 불필요 (around 15 chars)",
  "missingIntent": false,
  "intentNote": "Reason if missingIntent is true, else empty string",
  "SN": [ { "code": "SN-XXX", "reason": "..." } ],
  "MP": [ { "code": "MP-XXX", "reason": "..." } ],
  "PJ": [ { "code": "PJ-XXX", "reason": "..." } ],
  "SP": [ { "code": "SP-XXX", "reason": "..." } ]
}`;
