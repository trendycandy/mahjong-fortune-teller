// Vercel Serverless Function
export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // 환경변수에서 API 키 가져오기
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }
    
    try {
        // 오늘 날짜로 시드 생성 (같은 날은 같은 결과)
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        
        // 마작 패 리스트
        const tiles = [
            '1만', '2만', '3만', '4만', '5만', '6만', '7만', '8만', '9만',
            '1삭', '2삭', '3삭', '4삭', '5삭', '6삭', '7삭', '8삭', '9삭',
            '1통', '2통', '3통', '4통', '5통', '6통', '7통', '8통', '9통',
            '동', '남', '서', '북', '백', '발', '중'
        ];
        
        // 마작 역 리스트
        const yakus = [
            '리치', '탕야오', '핑후', '이페코', '삼색동순', '일기통관',
            '혼일색', '청일색', '또이또이', '산안커', '삼색동각',
            '치또이츠', '소삼원', '혼노두', '청노두', '산깡쯔', '역패'
        ];
        
        // 날짜 기반 시드로 선택
        const seed = hashCode(dateString);
        const luckyTile = tiles[Math.abs(seed) % tiles.length];
        const luckyYaku = yakus[Math.abs(seed * 2) % yakus.length];
        
        // Gemini API 호출
        const prompt = `당신은 마작 운세 전문가입니다.

오늘 날짜: ${dateString}
행운의 패: ${luckyTile}
행운의 역: ${luckyYaku}

다음 두 가지를 생성해주세요:

1. 오늘의 마작 운세 (30-50자):
   - 친근한 ~해요 체
   - 구체적인 마작 플레이 조언
   - 긍정적이고 격려하는 톤
   - 공격적/수비적/균형적/직관적 스타일 중 하나

2. 오늘의 팁 (20-40자):
   - 실용적인 마작 플레이 조언
   - 친근한 말투

좋은 예시:
운세: "타고난 센스를 살릴지도 몰라요. 직감에 따르는 타패를 해도 좋아요."
팁: "상대의 버림패를 잘 관찰하면 역이 보여요."

JSON 형식으로만 출력하세요:
{
  "fortune": "운세 내용",
  "tip": "팁 내용"
}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 200,
                    }
                })
            }
        );
        
        if (!response.ok) {
            throw new Error(`Gemini API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        // JSON 추출 (```json ... ``` 형식 처리)
        let jsonText = generatedText.trim();
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const generated = JSON.parse(jsonText);
        
        // 최종 응답
        const result = {
            fortune: generated.fortune,
            luckyTile: luckyTile,
            luckyYaku: luckyYaku,
            tip: generated.tip,
            date: dateString
        };
        
        // 캐시 헤더 설정 (같은 날은 캐시 사용)
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const cacheSeconds = Math.floor((tomorrow - today) / 1000);
        
        res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`);
        
        return res.status(200).json(result);
        
    } catch (error) {
        console.error('운세 생성 오류:', error);
        return res.status(500).json({ 
            error: '운세를 생성하는데 실패했습니다.',
            details: error.message 
        });
    }
}

// 문자열을 숫자로 해시하는 함수
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}
