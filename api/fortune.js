module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ 
            error: 'API 키가 설정되지 않았습니다.'
        });
    }
    
    try {
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        
        // 쿼리 파라미터에서 userId 가져오기
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
            '혼일색', '청일색', '또이또이', '산안커', '삼색동각',
            '치또이츠', '소삼원', '혼노두', '청노두', '산깡쯔',
        ];
        
        // 날짜 + 사용자 ID로 시드 생성
        const seedString = `${dateString}-${userId}`;
        const seed = hashCode(seedString);
        
        const luckyTile = tiles[Math.abs(seed) % tiles.length];
        const luckyYaku = yakus[Math.abs(seed * 2) % yakus.length];
        
        const prompt = `당신은 마작 운세 전문가입니다.

오늘 날짜: ${dateString}
행운의 패: ${luckyTile}
행운의 역: ${luckyYaku}

다음 두 가지를 생성해주세요:

1. 오늘의 마작 운세 (30-50자):
    - 한국어, 친근한 ~해요 체 
    - 30-50자 내외 
    - 문학적이고 비유적이지만 구체적인 마작 플레이 조언 
    - 긍정적이고 격려하는 톤 
    - 매번 다른 스타일 (공격적/수비적/균형적/직관적/감정적 중 랜덤) 
    좋은 예시: 
    타고난 센스를 살릴지도 몰라요. 직감에 따르는 타패를 해도 좋아요. 
    오늘은 수비보다 공격! 빠른 리치로 상대를 압박해보세요. 
    차분하게 상대의 패를 읽는 것이 중요한 날이에요.

2. 오늘의 팁 (20-40자):
    - 20-40자 내외 
    - 구체적이고 실용적인 조언 
    - 친근한 말투 
    - 매번 다른 내용
    좋은 예시:
    상대의 버림패를 잘 관찰하면 역이 보여요.
    도라 주변 패를 모으는 것도 좋은 전략이에요.
    무리한 론보다는 안전한 텐파이를 우선하세요.

반드시 JSON 형식으로만 출력하세요:
{
  "fortune": "운세 내용",
  "tip": "팁 내용"
}`;

        const https = require('https');
        
        const requestBody = {
            contents: [{
                parts: [{ 
                    text: prompt 
                }]
            }],
            generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1000
            }
        };
        
        const apiData = JSON.stringify(requestBody);
        
        const apiResponse = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(apiData)
                },
                timeout: 30000
            };
            
            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                
                apiRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                apiRes.on('end', () => {
                    if (apiRes.statusCode === 200) {
                        try {
                            const parsed = JSON.parse(data);
                            resolve(parsed);
                        } catch (e) {
                            reject(new Error(`JSON 파싱 실패: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`API 오류 ${apiRes.statusCode}: ${data}`));
                    }
                });
            });
            
            apiReq.on('error', (e) => {
                reject(e);
            });
            
            apiReq.on('timeout', () => {
                apiReq.destroy();
                reject(new Error('API 타임아웃'));
            });
            
            apiReq.write(apiData);
            apiReq.end();
        });
        
        if (!apiResponse.candidates || apiResponse.candidates.length === 0) {
            console.error('Candidates 없음:', JSON.stringify(apiResponse, null, 2));
            throw new Error('API 응답에 candidates가 없습니다');
        }
        
        if (!apiResponse.candidates[0].content || !apiResponse.candidates[0].content.parts || apiResponse.candidates[0].content.parts.length === 0) {
            console.error('Parts 없음:', JSON.stringify(apiResponse.candidates[0], null, 2));
            throw new Error('API 응답에 parts가 없습니다');
        }
        
        const generatedText = apiResponse.candidates[0].content.parts[0].text;
        
        let jsonText = generatedText.trim();
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const generated = JSON.parse(jsonText);
        
        const result = {
            fortune: generated.fortune,
            luckyTile: luckyTile,
            luckyYaku: luckyYaku,
            tip: generated.tip,
            date: dateString
        };
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const cacheSeconds = Math.floor((tomorrow - today) / 1000);
        
        res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`);
        
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('운세 생성 오류:', error.message);
        return res.status(500).json({ 
            error: '운세를 생성하는데 실패했습니다.',
            details: error.message
        });
    }
};

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}
