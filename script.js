// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    displayCurrentDate();
    loadFortune();
});

// 현재 날짜 표시
function displayCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[now.getDay()];
    
    document.getElementById('currentDate').textContent = 
        `${year}년 ${month}월 ${day}일 (${weekday})`;
}

// 사용자 고유 ID 생성 또는 가져오기
function getUserId() {
    let userId = localStorage.getItem('mahjong_user_id');
    
    if (!userId) {
        // 고유 ID 생성 (타임스탬프 + 랜덤)
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('mahjong_user_id', userId);
        console.log('새 사용자 ID 생성:', userId);
    } else {
        console.log('기존 사용자 ID:', userId);
    }
    
    return userId;
}

// 오늘의 운세가 이미 로컬에 저장되어 있는지 확인
function getTodaysCachedFortune() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cachedData = localStorage.getItem('mahjong_fortune');
    
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (parsed.date === today && parsed.userId === getUserId()) {
                console.log('로컬 캐시에서 운세 불러옴');
                return parsed.fortune;
            }
        } catch (e) {
            console.error('캐시 파싱 실패:', e);
        }
    }
    
    return null;
}

// 운세를 로컬에 저장
function cacheFortune(fortuneData) {
    const today = new Date().toISOString().split('T')[0];
    const cacheData = {
        date: today,
        userId: getUserId(),
        fortune: fortuneData
    };
    localStorage.setItem('mahjong_fortune', JSON.stringify(cacheData));
    console.log('운세를 로컬에 저장함');
}

// 운세 불러오기
async function loadFortune() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('fortune-content');
    const error = document.getElementById('error');
    
    // 로딩 표시
    loading.style.display = 'block';
    content.style.display = 'none';
    error.style.display = 'none';
    
    // 먼저 로컬 캐시 확인
    const cachedFortune = getTodaysCachedFortune();
    
    if (cachedFortune) {
        // 캐시된 운세 표시
        displayFortune(cachedFortune);
        loading.style.display = 'none';
        content.style.display = 'block';
        return;
    }
    
    try {
        // 사용자 ID를 쿼리 파라미터로 전달
        const userId = getUserId();
        const response = await fetch(`/api/fortune?userId=${encodeURIComponent(userId)}`);
        
        if (!response.ok) {
            throw new Error('API 호출 실패');
        }
        
        const data = await response.json();
        
        // 운세 표시
        displayFortune(data);
        
        // 로컬에 저장
        cacheFortune(data);
        
        // 컨텐츠 표시
        loading.style.display = 'none';
        content.style.display = 'block';
        
    } catch (err) {
        console.error('운세 로드 실패:', err);
        loading.style.display = 'none';
        error.style.display = 'block';
    }
}

// 운세 표시
function displayFortune(data) {
    document.getElementById('fortuneText').textContent = data.fortune;
    document.getElementById('luckyTile').textContent = data.luckyTile;
    document.getElementById('luckyYaku').textContent = data.luckyYaku;
    document.getElementById('tip').textContent = data.tip;
}



// 공유 기능
function shareFortune() {
    const fortuneData = getTodaysCachedFortune();
    
    if (!fortuneData) {
        alert('운세 정보를 불러올 수 없습니다.');
        return;
    }
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
    
    const shareText = `🎴 ${dateStr} 마작 운세

💬 ${fortuneData.fortune}
🀄 행운의 패: ${fortuneData.luckyTile}
🎯 행운의 역: ${fortuneData.luckyYaku}
💡 ${fortuneData.tip}

#마작운세 #마작`;
    
    // 클립보드에 복사 (디폴트)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('운세가 클립보드에 복사되었습니다! 📋\n\n원하는 곳에 붙여넣기 하세요.');
        }).catch(() => {
            // 실패 시 폴백
            fallbackCopy(shareText);
        });
    } else {
        // 구형 브라우저 폴백
        fallbackCopy(shareText);
    }
}

// 폴백 복사 함수
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        alert('운세가 클립보드에 복사되었습니다! 📋');
    } catch (err) {
        alert('복사에 실패했습니다. 수동으로 복사해주세요.');
    }
    
    document.body.removeChild(textArea);
}
