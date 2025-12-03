module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    // API 키 확인 (처음 몇 글자만 보여줌)
    const keyPreview = GEMINI_API_KEY ? 
        `${GEMINI_API_KEY.substring(0, 10)}...${GEMINI_API_KEY.slice(-4)}` : 
        'API 키 없음';
    
    return res.status(200).json({
        message: 'API 키 테스트',
        keyPreview: keyPreview,
        keyLength: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0
    });
};
