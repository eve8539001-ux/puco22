import db from '../src/data/puco_capability_db.json';
import { snPromptTemplate, reactionPromptTemplate } from './prompt';
import { findByCode } from '../src/data/loadDB';

// Helper to call Anthropic API with retry logic
async function callAnthropicAPI(apiKey: string, systemPrompt: string, initialUserMessage: string) {
  let messages = [{ role: 'user', content: initialUserMessage }];
  let attempts = 0;
  
  while (attempts < 3) {
    attempts++;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API Error: ${errText}`);
    }

    const data = await response.json();
    const resultText = data.content[0].text;
    
    // Extract JSON safely
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    let rawJson = resultText;
    if (jsonMatch) {
      rawJson = jsonMatch[0];
    }

    try {
      // JSON 파싱 시도
      // "0건 응답"(빈 배열) 등은 JSON 형태가 완벽히 맞다면 정상 응답으로 파싱되며 
      // 예외(catch)로 넘어가지 않으므로 재시도 대상이 아님이 명확합니다.
      return JSON.parse(rawJson);
    } catch (e) {
      if (attempts >= 3) {
        throw new Error('JSON_PARSE_FAILED');
      }
      // If parsing fails, ask Claude to fix it and retry
      messages.push({ role: 'assistant', content: resultText });
      messages.push({ role: 'user', content: '순수 JSON만 다시 출력해줘' });
    }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is missing');
    return res.status(500).json({ error: 'API Key not configured' });
  }

  const { scenario } = req.body || {};
  if (!scenario) {
    return res.status(400).json({ error: 'Scenario is required' });
  }

  try {
    // 1. Compress lists: code|category|name
    const formatItem = (item: any) => `${item.code}|${item.category}|${item.name}`;
    const snList = db.SN.map(formatItem).join('\n');
    const mpList = db.MP.map(formatItem).join('\n');
    const pjList = db.PJ.map(formatItem).join('\n');
    const spList = db.SP.map(formatItem).join('\n');
    
    // 2. First Stage: Get SN triggers
    const snPrompt = snPromptTemplate.replace('{SN_LIST}', snList);
    const snResult = await callAnthropicAPI(apiKey, snPrompt, scenario);
    
    // Validate SN result
    let triggeredSN = snResult.triggered || [];
    triggeredSN = triggeredSN.filter((item: any) => findByCode('SN', item.code));

    // 3. Second Stage: Get MP/PJ/SP based on SN triggers
    const reactionPrompt = reactionPromptTemplate
      .replace('{MP_LIST}', mpList)
      .replace('{PJ_LIST}', pjList)
      .replace('{SP_LIST}', spList);
      
    const reactionUserMessage = `Scenario: ${scenario}\n\nTriggered SN context from stage 1:\n${JSON.stringify(triggeredSN, null, 2)}`;
    
    const finalResult = await callAnthropicAPI(apiKey, reactionPrompt, reactionUserMessage);
    
    // Make sure SN is injected or properly handled by Claude
    if (!finalResult.SN || finalResult.SN.length === 0) {
      finalResult.SN = triggeredSN;
    }

    // Validate existence of all capability codes and filter out invalid ones silently
    if (finalResult.SN) {
      finalResult.SN = finalResult.SN.filter((item: any) => findByCode('SN', item.code));
    }
    if (finalResult.MP) {
      finalResult.MP = finalResult.MP.filter((item: any) => findByCode('MP', item.code));
    }
    if (finalResult.PJ) {
      finalResult.PJ = finalResult.PJ.filter((item: any) => findByCode('PJ', item.code));
    }
    if (finalResult.SP) {
      finalResult.SP = finalResult.SP.filter((item: any) => findByCode('SP', item.code));
    }

    // 4. Compute sensorGroups (ToF / RGB Camera)
    const sensorGroups = { tof: false, camera: false };
    if (finalResult.SN) {
      for (const item of finalResult.SN) {
        if (item.code.startsWith('SN-A')) {
          sensorGroups.tof = true;
        } else if (['SN-B', 'SN-C', 'SN-D'].some(prefix => item.code.startsWith(prefix))) {
          sensorGroups.camera = true;
        }
      }
    }
    finalResult.sensorGroups = sensorGroups;

    return res.status(200).json(finalResult);
  } catch (error: any) {
    console.error('Match Error:', error);
    if (error.message === 'JSON_PARSE_FAILED') {
      return res.status(422).json({ error: 'AI 응답 포맷이 올바르지 않습니다. 다시 시도해 주세요.' });
    }
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
