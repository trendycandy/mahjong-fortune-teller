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
        
        const tiles = [
            '1만', '2만', '3만', '4만', '5만', '6만', '7만', '8만', '9만',
            '1삭', '2삭', '3삭', '4삭', '5삭', '6삭', '7삭', '8삭', '9삭',
            '1통', '2통', '3통', '4통', '5통', '6통', '7통', '8통', '9통',
            '동', '남', '서', '북', '백', '발', '중'
        ];
        
        const yakus = [
            '리치', '탕야오', '핑후', '이페코', '삼색동순', '일기통관',
            '혼일색', '청일색', '또이또이', '산안커', '삼색동각',
            '치또이츠', '소삼원', '혼노두', '청노두', '산깡쯔', '역패'
        ];
        
        const seed = hashCode(dateString);
        const luckyTile = tiles[Math.abs(seed) % tiles.length];
        const luckyYaku = yakus[Math.abs(seed * 2) % yakus.length];
        
        const prompt = `당신은 마작 운세 전문가입니다.

오늘 날짜: ${dateString}
행운의 패: ${luckyTile}
행운의 역: ${luckyYaku}

다음 두 가지를 생성해주세요:

1. 오늘의 마작 운세 (30-50자):
   - 친근한 ~해요 체
   - 구체적인 마작 플레이 조언
   - 긍정적이고 격려하는 톤

2. 오늘의 팁 (20-40자):
   - 실용적인 마작 플레이 조언

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
                maxOutputTokens: 200,
            }
        };
        
        const apiData = JSON.stringify(requestBody);
        
        const apiResponse = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
        
        if (!apiResponse.candidates || !apiResponse.candidates[0]) {
            throw new Error('API 응답 형식 오류');
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
