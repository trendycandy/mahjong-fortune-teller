const https = require('https');

// 모델 리스트 (그대로 유지)
const MODEL_LIST = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite', 
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-2.0-flash-001', 
    'gemini-flash-latest',       
    'gemini-flash-lite-latest',
    'gemma-3-27b-it',
    'gemma-3-12b-it',
    'gemini-2.5-pro',
    'gemini-pro-latest',
    'gemini-2.0-pro-exp-02-05'
];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    try {
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

        const url = new URL(req.url, `http://${req.headers.host}`);
        const userId = url.searchParams.get('userId') || 'anonymous';

        console.log('사용자 ID:', userId);

        const tiles = [
            '1만', '2만', '3만', '4만', '5만', '6만', '7만', '8만', '9만',
            '1삭', '2삭', '3삭', '4삭', '5삭', '6삭', '7삭', '8삭', '9삭',
            '1통', '2통', '3통', '4통', '5통', '6통', '7통', '8통', '9통',
            '동', '남', '서', '북', '백', '발', '중'
        ];
        const yakus = [
            '리치', '탕야오', '멘젠쯔모', '핑후', '역패-자풍', '역패-장풍', '역패-백', '역패-발', '역패-중', '이페코',
            '삼색동순', '일기통관', '찬타', '준찬타', '더블리치', '창깡', '하저로어', '해저모월', '영상개화', '량페코',
            '혼일색', '청일색', '또이또이', '산안커', '삼색동각'
            '치또이츠', '소삼원', '혼노두', '산깡쯔'
        ];

        const seedString = `${dateString}-${userId}`;
        const seed = hashCode(seedString);

        const luckyTile = tiles[Math.abs(seed) % tiles.length];
        const luckyYaku = yakus[Math.abs(seed * 2) % yakus.length];

        const prompt = `당신은 마작 운세 전문가입니다.
오늘의 운세와 팁을 생성해주세요. 
행운의 패(${luckyTile})와 행운의 역(${luckyYaku})은 오늘의 운세에는 참고만 하고, 직접 언급하지 마세요.

1. 오늘의 마작 운세 (30-50자):
    - 한국어, 친근한 ~해요 체
    - 30-50자 내외
    - 구체적인 마작 플레이 조언과 전략
    - 긍정적이고 격려하는 톤
    - 다양한 스타일로 작성 (공격적/수비적/균형적/직관적/심리적 등)
    - 행운의 패(${luckyTile})와 행운의 역(${luckyYaku})은 오늘의 운세에는 참고만 하고, 직접 언급하지 마세요.

2. 오늘의 팁 (20-40자):
    - 20-40자 내외
    - 구체적이고 실용적인 조언
    - 친근한 말투
    - 매번 다른 내용
    - 오늘의 운세와 연관되는 팁으로 작성

반드시 JSON 형식으로만 출력하세요:
{
  "fortune": "운세 내용",
  "tip": "팁 내용"
}`;

        // [핵심 변경 1] 안전 설정 추가 (차단 방지)
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ],
            generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1000
            }
        };

        const apiData = JSON.stringify(requestBody);
        let apiResponse = null;
        let lastError = null;

        for (const modelName of MODEL_LIST) {
            try {
                const cleanModelName = modelName.replace('models/', '');
                console.log(`🤖 시도 중: ${cleanModelName}...`);

                const tempResponse = await callGeminiAPI(cleanModelName, GEMINI_API_KEY, apiData);
                
                // [핵심 변경 2] 응답 검증을 반복문 안으로 이동
                // parts가 없으면(안전 필터 차단 등) 성공으로 치지 않고 다음 모델로 넘어감
                if (!tempResponse.candidates || 
                    tempResponse.candidates.length === 0 || 
                    !tempResponse.candidates[0].content || 
                    !tempResponse.candidates[0].content.parts || 
                    tempResponse.candidates[0].content.parts.length === 0) {
                    
                    console.warn(`⚠️ 필터링됨 (${cleanModelName}): 응답 내용 없음. 다음 모델 시도.`);
                    // finishReason이 있다면 로그에 출력해봄 (예: SAFETY)
                    if (tempResponse.candidates && tempResponse.candidates[0] && tempResponse.candidates[0].finishReason) {
                        console.warn(`   -> 사유: ${tempResponse.candidates[0].finishReason}`);
                    }
                    continue; // 다음 모델로!
                }

                // 검증 통과하면 채택
                apiResponse = tempResponse;
                console.log(`✅ 성공! (${cleanModelName} 모델 사용)`);
                break; 

            } catch (error) {
                console.warn(`⚠️ 오류 (${modelName}): ${error.message}`);
                lastError = error;
            }
        }

        if (!apiResponse) {
            throw new Error(`모든 모델 시도 실패. (필터링되거나 오류 발생). 마지막 에러: ${lastError?.message}`);
        }

        // ... (위쪽 코드는 동일)

        // [수정됨] 응답 추출 및 정제 로직 강화
        const generatedText = apiResponse.candidates[0].content.parts[0].text;
        
        console.log(`🔍 원본 응답(${apiResponse.modelVersion || 'unknown'}):`, generatedText); // 디버깅용 로그

        let jsonText = generatedText;

        // 1. JSON 코드 블록 마크다운 제거
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '');

        // 2. 가장 확실한 방법: 첫 번째 '{'와 마지막 '}' 사이만 추출
        const firstOpen = jsonText.indexOf('{');
        const lastClose = jsonText.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            jsonText = jsonText.substring(firstOpen, lastClose + 1);
        } else {
            // 중괄호를 못 찾았으면 에러 처리
            throw new Error('AI 응답에서 JSON 객체({ ... })를 찾을 수 없습니다.');
        }

        // 3. 혹시 모를 줄바꿈/공백 제거 후 파싱
        let generated;
        try {
            generated = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('JSON 파싱 실패 원본:', jsonText);
            
            // 4. (비상용) 아주 드물게 따옴표가 꼬인 경우 복구 시도 (Control Character 제거)
            try {
                const cleaned = jsonText.replace(/[\u0000-\u001F]+/g, " "); 
                generated = JSON.parse(cleaned);
            } catch (retryError) {
                throw new Error(`JSON 형식이 올바르지 않습니다: ${parseError.message}`);
            }
        }

        const result = {
            fortune: generated.fortune || "운세를 불러오는 중 별들이 잠시 길을 잃었어요.", // 방어 코드
            luckyTile: luckyTile,
            luckyYaku: luckyYaku,
            tip: generated.tip || "잠시 후 다시 시도해보세요.",
            date: dateString
        };

        // ... (아래쪽 캐싱 및 res.json 코드는 동일)

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const cacheSeconds = Math.floor((tomorrow - today) / 1000);

        res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`);
        return res.status(200).json(result);

    } catch (error) {
        console.error('서버 내부 오류:', error.message);
        return res.status(500).json({
            error: '운세를 생성하는데 실패했습니다.',
            details: error.message
        });
    }
};

function callGeminiAPI(modelName, apiKey, apiData) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(apiData)
            },
            timeout: 20000 
        };

        const apiReq = https.request(options, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => (data += chunk));
            apiRes.on('end', () => {
                if (apiRes.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`JSON 파싱 실패: ${e.message}`));
                    }
                } else {
                    reject(new Error(`API 상태 코드 ${apiRes.statusCode}: ${data}`));
                }
            });
        });

        apiReq.on('error', (e) => reject(e));
        apiReq.on('timeout', () => {
            apiReq.destroy();
            reject(new Error('API 응답 시간 초과'));
        });

        apiReq.write(apiData);
        apiReq.end();
    });
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}
