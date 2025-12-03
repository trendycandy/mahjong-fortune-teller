// 간단한 테스트 버전
export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // API 키 확인
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            return res.status(200).json({ 
                error: 'API 키가 설정되지 않았습니다.',
                debug: 'Environment Variables에 GEMINI_API_KEY를 추가해주세요.'
            });
        }
        
        // 테스트 응답 (우선 AI 없이)
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        
        const testResponse = {
            fortune: "오늘은 대담하게 리치를 걸어보세요. 흐름이 좋은 날이에요!",
            luckyTile: "5만",
            luckyYaku: "리치",
            tip: "상대의 버림패를 잘 관찰하면 승기가 보여요.",
            date: dateString,
            status: 'API 키 확인됨 - AI 생성 준비 완료'
        };
        
        return res.status(200).json(testResponse);
        
    } catch (error) {
        return res.status(200).json({ 
            error: error.message,
            stack: error.stack
        });
    }
}
