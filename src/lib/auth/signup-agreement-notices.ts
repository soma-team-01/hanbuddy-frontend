import type { SignupAgreementType } from "@/lib/auth/types";

export const SIGNUP_AGREEMENT_DOCUMENT_VERSION = "2026-09-06";

interface SignupAgreementNotice {
  readonly paragraphs: readonly string[];
  readonly details?: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

export type SignupAgreementDocuments = Partial<
  Record<SignupAgreementType, { readonly version: string; readonly source: string }>
>;

export const SIGNUP_AGREEMENT_NOTICES: Record<SignupAgreementType, SignupAgreementNotice> = {
  ADULT_CONFIRMATION: {
    paragraphs: [
      "본인은 만 19세 이상이며, HanBuddy 서비스가 성인만 가입하고 이용할 수 있는 서비스임을 확인합니다.",
    ],
  },
  TERMS_OF_SERVICE: {
    paragraphs: ["본인은 HanBuddy 이용약관의 전문을 확인하였으며 이에 동의합니다."],
  },
  PRIVACY_COLLECTION_USE: {
    paragraphs: ["본인은 아래 개인정보 수집·이용 내용을 확인하였으며 이에 동의합니다."],
    details: [
      {
        label: "수집 항목",
        value:
          "Google 계정 식별자, 이메일, 이름, 프로필 이미지, 닉네임, 국적, 생년월일, 선호 연락수단, 연락처 식별자 또는 전화번호",
      },
      {
        label: "이용 목적",
        value:
          "회원 가입과 로그인, 본인·연령 확인, 프로필 제공, 예약 당사자 간 연락, 계정 보안, 고객지원",
      },
      {
        label: "보유 기간",
        value:
          "회원 탈퇴 시까지. 다만 계약·결제·분쟁 및 동의 기록은 관련 법령이 정한 기간 동안 분리 보관",
      },
      {
        label: "거부 권리와 불이익",
        value: "동의를 거부할 수 있으나, 필수 정보이므로 회원 가입과 서비스 이용이 어렵습니다.",
      },
    ],
  },
  BUDDY_OPERATION_TERMS: {
    paragraphs: [
      "본인은 버디 운영약관을 확인하였으며, 활동 정보의 정확성, 예약 이행, 안전조치, 이용자 개인정보 보호 및 커뮤니티 기준을 준수하는 데 동의합니다.",
    ],
  },
  BUDDY_COMMISSION_POLICY: {
    paragraphs: [
      "본인은 버디 수수료·정산 정책을 확인하였으며, 본인에게 표시된 수수료율, 정산 주기, 취소·환불·차지백의 정산 반영 기준에 동의합니다.",
    ],
  },
  // The backend enum name is retained for API compatibility. The agreement covers the buddy's
  // handling of tourist contact details; it does not authorize disclosure of buddy contact details.
  BUDDY_PROFILE_CONTACT_PROVISION: {
    paragraphs: [
      "본인은 예약 확정 후 제공받는 투어리스트 정보를 아래 범위에서만 이용하고 보호할 의무를 확인했습니다.",
      "버디의 연락수단과 연락처는 투어리스트에게 제공되지 않습니다.",
    ],
    details: [
      {
        label: "제공 정보",
        value: "투어리스트 닉네임, 프로필 이미지, 예약 인원, 요청사항, 선호 연락수단과 연락처",
      },
      {
        label: "이용 목적",
        value: "활동 준비, 참여자 확인, 일정·장소 연락, 안전 대응 및 분쟁처리",
      },
      {
        label: "금지 사항",
        value: "광고, 사적 연락, 외부 서비스 권유, 명단 작성 및 제3자 제공",
      },
      {
        label: "보관·삭제",
        value: "활동 및 분쟁처리 목적 달성 후 별도로 저장한 정보를 지체 없이 삭제",
      },
      {
        label: "확인 필요성",
        value: "버디 활동 제공에 필요한 의무이며, 위반 시 서비스 이용이 제한될 수 있습니다.",
      },
    ],
  },
  MARKETING_COMMUNICATION: {
    paragraphs: [
      "본인은 이메일을 통한 마케팅 정보 수신에 동의합니다. 계정 설정 또는 이메일의 수신거부 기능으로 언제든 철회할 수 있습니다.",
    ],
    details: [
      {
        label: "수집·이용 항목",
        value: "이메일, 닉네임, 서비스 이용·예약 이력",
      },
      {
        label: "이용 목적",
        value: "이벤트, 혜택, 신규 활동 및 프로모션 안내",
      },
      {
        label: "보유 기간",
        value: "동의 철회 또는 회원 탈퇴 시까지",
      },
      {
        label: "거부 권리와 불이익",
        value: "동의를 거부해도 서비스의 기본 기능을 이용할 수 있습니다.",
      },
    ],
  },
};
