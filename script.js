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

// 운세 불러오기
async function loadFortune() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('fortune-content');
    const error = document.getElementById('error');
    
    // 로딩 표시
    loading.style.display = 'block';
    content.style.display = 'none';
    error.style.display = 'none';
    
    try {
        // API 호출
        const response = await fetch('/api/fortune');
        
        if (!response.ok) {
            throw new Error('API 호출 실패');
        }
        
        const data = await response.json();
        
        // 운세 표시
        document.getElementById('fortuneText').textContent = data.fortune;
        document.getElementById('luckyTile').textContent = data.luckyTile;
        document.getElementById('luckyYaku').textContent = data.luckyYaku;
        document.getElementById('tip').textContent = data.tip;
        
        // 로컬 스토리지에 저장 (공유 기능용)
        localStorage.setItem('todayFortune', JSON.stringify(data));
        
        // 컨텐츠 표시
        loading.style.display = 'none';
        content.style.display = 'block';
        
    } catch (err) {
        console.error('운세 로드 실패:', err);
        loading.style.display = 'none';
        error.style.display = 'block';
    }
}

// 공유 기능
function shareFortune() {
    const fortune = localStorage.getItem('todayFortune');
    
    if (!fortune) {
        alert('운세 정보를 불러올 수 없습니다.');
        return;
    }
    
    const data = JSON.parse(fortune);
    const now = new Date();
    const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
    
    const shareText = `🎴 ${dateStr} 마작 운세

💬 ${data.fortune}
🀄 행운의 패: ${data.luckyTile}
🎯 행운의 역: ${data.luckyYaku}
💡 ${data.tip}

#마작운세 #마작`;
    
    // Web Share API 지원 확인
    if (navigator.share) {
        navigator.share({
            title: '🎴 오늘의 마작 운세',
            text: shareText,
            url: window.location.href
        }).catch(err => {
            console.log('공유 취소:', err);
        });
    } else {
        // 클립보드에 복사
        navigator.clipboard.writeText(shareText).then(() => {
            alert('운세가 클립보드에 복사되었습니다! 📋\n\n원하는 곳에 붙여넣기 하세요.');
        }).catch(() => {
            // 폴백: 텍스트 영역 생성
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('운세가 클립보드에 복사되었습니다! 📋');
        });
    }
}
