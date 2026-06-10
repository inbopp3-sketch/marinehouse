const FORM_EMAIL = 'marinehouse06@gmail.com';

document.getElementById('leadForm')?.addEventListener('submit', function (event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get('name') || '';
  const phone = data.get('phone') || '';
  const area = data.get('area') || '';
  const time = data.get('time') || '미입력';
  const subject = `[무인창업 상담신청] ${name} / ${area}`;
  const body = [
    '마린하우스코리아 본사 지원형 무인창업 상담 신청입니다.',
    '',
    `이름: ${name}`,
    `연락처: ${phone}`,
    `희망 지역: ${area}`,
    `상담 희망 시간: ${time}`,
    '',
    '창업 가능 여부 검토 부탁드립니다.'
  ].join('\n');
  window.location.href = `mailto:${FORM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
