/** Built-in review questions from the lecture slides; the answer is shown only when the instructor publishes. */
export type BankQuestion = { prompt: string; answer: string };
export type BankSection = { title: string; questions: BankQuestion[] };

export const QUESTION_BANK: BankSection[] = [
  {
    title: '1교시 · AI 기본개념과 프롬프트 엔지니어링',
    questions: [
      { prompt: '목표를 주면 스스로 계획을 세우고 여러 단계를 거쳐 일을 처리하는 AI는?', answer: 'AI 에이전트' },
      { prompt: '특정 산업이나 분야에 특화된 AI는?', answer: '버티컬 AI' },
      { prompt: '로봇처럼 현실 세계에서 몸을 갖고 움직이는 AI 트렌드는?', answer: '피지컬 AI' },
      { prompt: 'AI가 사실이 아닌 내용을 자연스러운 문장으로 지어내는 현상은?', answer: '환각(Hallucination)' },
      { prompt: "AI는 '사고'하는 것이 아니라 무엇을 하는가?", answer: '다음에 올 말을 예측한다 (그래서 정답이 아니라 가장 그럴듯한 답을 만든다)' },
      { prompt: '환각을 줄이려면 질문할 때 무엇을 요청해야 하는가? (3가지)', answer: '사실과 추정 구분 표시 / 출처와 링크 / 모르는 건 "확인 필요"로 쓰기' },
      { prompt: '좋은 프롬프트에 들어가는 6가지 요소는?', answer: '역할·맥락·임무·형식·어조·독자' },
      { prompt: '6요소 중 "바쁜 임원이 30초 안에 읽게"처럼 눈높이를 정하는 요소는?', answer: '독자(Audience)' },
      { prompt: '6요소 중 결과를 바로 복사해 쓸 수 있게 해 줘서 수정 시간을 가장 많이 줄여 주는 요소는?', answer: '형식(Format)' },
      { prompt: '어떻게 물어야 할지 막막할 때, 프롬프트 자체를 AI에게 먼저 만들게 하는 기법은?', answer: '메타 프롬프팅' },
      { prompt: 'AI가 필요한 정보를 하나씩 되묻게 해서 빠뜨린 내용을 채우는 기법은?', answer: '프롬프트 인터뷰' },
      { prompt: '초안을 기준 3가지로 AI가 스스로 검토하고 수정본을 내게 하는 기법은?', answer: '자가비판' },
      { prompt: "원하는 '입력→출력' 예시를 먼저 보여 주고 같은 형식으로 만들게 하는 기법은?", answer: '예시로 학습시키기(퓨샷)' },
      { prompt: 'AI가 글을 잘게 쪼개 읽는 단위이자 요금과 길이 제한을 계산하는 기준은?', answer: '토큰' },
      { prompt: 'AI가 한 번의 대화에서 기억할 수 있는 분량은?', answer: '컨텍스트 창(Context Window)' },
      { prompt: '사람 이름이나 업체명이 들어간 회의록은 AI에 어떻게 넣어야 하는가?', answer: '"A씨, B업체"처럼 가리고 넣는다' }
    ]
  },
  {
    title: '2교시 · AI 도구별 활용법',
    questions: [
      { prompt: '몇 초 만에 사실 하나를 확인하는 기능과, 몇 분 동안 여러 자료를 읽고 보고서를 쓰는 기능은 각각 무엇인가?', answer: '웹 검색 / 심층 리서치(Deep Research)' },
      { prompt: '주제별로 대화·파일·지침을 한데 묶어 관리하는 기능은? (ChatGPT·Claude 공통)', answer: '프로젝트' },
      { prompt: 'Gemini에서 지침과 참고 파일을 저장해 두고 쓰는 나만의 전용 챗봇은?', answer: 'Gem(Gems)' },
      { prompt: '웹에서 여러 단계로 된 일을 대신 처리할 때, 결제·제출·삭제 직전에는 어떻게 해야 하는가?', answer: '멈추고 사람이 확인한다' },
      { prompt: 'Claude에서 대화 내용이 문서·표·웹페이지 같은 결과물로 바로 만들어지는 기능은?', answer: '아티팩트' },
      { prompt: 'NotebookLM의 바뀐 이름은?', answer: 'Gemini Notebook' },
      { prompt: 'Gemini Notebook에서 답변이 원문의 어디에서 나왔는지 확인하는 방법은?', answer: '답변 끝의 인용 번호를 누른다' },
      { prompt: 'Gemini Notebook에서 자료를 오디오·마인드맵·퀴즈·슬라이드로 바꿔 주는 영역은?', answer: '스튜디오' },
      { prompt: '한 도구에서 받은 답을 다른 도구에 검토시키고 공식 자료와 대조하는 방법은?', answer: '교차 검증' },
      { prompt: '어떤 AI 도구든 쓰기 전에 확인할 설정 세 가지는?', answer: '대화 학습 설정 / 기록·메모리 관리 / 업무 계정 정책' }
    ]
  },
  {
    title: '4교시 · 바이브코딩',
    questions: [
      { prompt: '코드를 몰라도 만들고 싶은 것을 말로 설명하고, 실행해 보면서 대화로 고쳐 나가는 개발 방식은?', answer: '바이브코딩' },
      { prompt: '좋은 앱 요구사항에 들어가야 하는 네 칸은?', answer: '입력·처리·출력·디자인' },
      { prompt: '바이브코딩으로 처음 만들어 보기에 알맞은 것은? (쇼핑몰 / 민원 DB 시스템 / 회비 정산기 / 개인정보 명부)', answer: '회비 정산기 (화면 1개로 입력→계산→결과가 분명한 도구)' },
      { prompt: '앱을 대화로 고칠 때 지켜야 할 요령 다섯 가지는?', answer: '한 번에 하나만 고치기 / 오류 문구 그대로 붙여 넣기 / 화면 캡처 보여 주기 / 잘 되면 저장하기 / 망가지면 되돌리기' }
    ]
  }
];
