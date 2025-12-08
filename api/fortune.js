const https = require('https');

// 1. 사용 가능한 모든 "텍스트 생성 모델"을 총동원한 리스트
// 전략: 최신 2.5 -> 최신 Lite -> 구버전 2.0 -> 구버전 Lite -> 별칭(Latest) -> 오픈모델(Gemma) -> 고성능(Pro)
const MODEL_LIST = [
    // [1군] 최신 2.5 시리즈 (가장 빠르고 똑똑함)
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite', 
    
    // [2군] 2.0 시리즈 (2.5와 쿼터가 분리되어 있을 가능성 높음)
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-2.0-flash-001', 
    
    // [3군] 별칭 모델 (구글이 알아서 최신 버전 연결, 비상용)
    'gemini-flash-latest',       
    'gemini-flash-lite-latest',
    
    // [4군] Gemma 시리즈 (Gemini와 아예 다른 계열이라 쿼터 별도일 확률 매우 높음)
    'gemma-3-27b-it',
    'gemma-3-12b-it',
    
    // [5군] Pro 시리즈 (속도는 조금 느리지만 성능 최상, 최후의 보루)
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

        // 마작 데이터
        const tiles = [
            '1만', '2만', '3만', '4만', '5만', '6만', '7만', '8만', '9만',
            '1삭', '2삭', '3삭', '4삭', '5삭', '6삭', '7삭', '8삭', '9삭',
            '1통', '2통', '3통', '4통', '5통', '6통', '7통', '8통', '9통',
            '동', '남', '서', '북', '백', '발', '중'
        ];
        const yakus = [
            '리치', '탕야오', '멘젠쯔모', '핑후', '역패-자풍', '역패-장풍', '역패-백', '역패-발', '역패-중', '이페코',
            '삼색동순', '일기통관', '찬타', '준찬타', '더블리치', '창깡', '하저로어', '해저모월', '영상개화', '량페코',
            '혼일색', '청일색', '또이또이', '산안커', '삼색동각',
            '치또이츠', '소삼원', '혼노두', '청노두', '산깡쯔',
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

        // API 요청 설정
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
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

        // --- 모델 폴백(Fallback) 로직 시작 ---
        for (const modelName of MODEL_LIST) {
            try {
                // 모델명에 'models/'가 붙어있을 수도, 아닐 수도 있으니 안전하게 제거 후 사용
                const cleanModelName = modelName.replace('models/', '');
                console.log(`🤖 시도 중: ${cleanModelName}...`);

                apiResponse = await callGeminiAPI(cleanModelName, GEMINI_API_KEY, apiData);
                
                console.log(`✅ 성공! (${cleanModelName} 모델 사용)`);
                break; // 성공하면 탈출!

            } catch (error) {
                // 에러 로그만 찍고 멈추지 않고 다음 모델로 넘어감
                console.warn(`⚠️ 실패 (${modelName}): ${error.message}`);
                lastError = error;
            }
        }
        // --- 모델 폴백 로직 끝 ---

        if (!apiResponse) {
            throw new Error(`모든 모델(${MODEL_LIST.length}개) 시도 실패. 마지막 에러: ${lastError?.message}`);
        }

        // 응답 검증 및 파싱
        if (!apiResponse.candidates || apiResponse.candidates.length === 0) {
            throw new Error('API 응답에 candidates가 없습니다: ' + JSON.stringify(apiResponse));
        }
        if (!apiResponse.candidates[0].content?.parts?.[0]) {
            throw new Error('API 응답에 parts가 없습니다.');
        }

        const generatedText = apiResponse.candidates[0].content.parts[0].text;
        let jsonText = generatedText.trim();
        // 마크다운 코드 블록 제거
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const generated = JSON.parse(jsonText);

        const result = {
            fortune: generated.fortune,
            luckyTile: luckyTile,
            luckyYaku: luckyYaku,
            tip: generated.tip,
            date: dateString
        };

        // 캐싱 설정 (내일 0시까지)
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

// API 호출 헬퍼 함수
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
            timeout: 20000 // 20초 (너무 오래 걸리면 다음 모델로 넘기기 위해 약간 줄임)
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
                    // 429(Too Many Requests), 503(Overloaded) 등 에러 리턴
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
