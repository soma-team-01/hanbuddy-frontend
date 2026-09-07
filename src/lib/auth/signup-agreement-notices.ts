import type { SignupAgreementType, UserType } from "@/lib/auth/types";

export const SIGNUP_AGREEMENT_DOCUMENT_VERSION = "2026-09-07";

export interface SignupAgreementNotice {
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
      "본인은 버디 수수료·정산 정책을 확인하였으며, 기본 버디는 플랫폼 수수료 20%와 그 수수료에 대한 부가가치세 2%를 합한 총 22%, 얼리 버디는 수수료 10%와 그 수수료에 대한 부가가치세 1%를 합한 총 11%가 실제 판매금액에서 공제됨을 확인합니다.",
      "또한 본인에게 표시된 정산 주기와 취소·환불·차지백의 정산 반영 기준에 동의합니다.",
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

const BUDDY_PRIVACY_COLLECTION_USE_NOTICE: SignupAgreementNotice = {
  paragraphs: ["본인은 아래 개인정보 수집·이용 내용을 확인하였으며 이에 동의합니다."],
  details: [
    {
      label: "수집 항목",
      value:
        "Google 계정 식별자, 이메일, 이름, 프로필 이미지, 닉네임, 국적, 생년월일, 가입 심사와 운영 연락을 위한 전화번호",
    },
    {
      label: "이용 목적",
      value:
        "회원 가입과 로그인, 본인·연령 확인, 버디 가입 심사 및 결과 안내, 서비스 운영 연락, 프로필 제공, 계정 보안, 고객지원",
    },
    {
      label: "보유 기간",
      value:
        "회원 탈퇴 시까지. 다만 계약·결제·분쟁 및 동의 기록은 관련 법령이 정한 기간 동안 분리 보관",
    },
    {
      label: "거부 권리와 불이익",
      value: "동의를 거부할 수 있으나, 필수 정보이므로 버디 회원 가입과 서비스 이용이 어렵습니다.",
    },
  ],
};

export function getSignupAgreementNotice(
  agreementType: SignupAgreementType,
  userType: UserType,
): SignupAgreementNotice {
  if (agreementType === "PRIVACY_COLLECTION_USE" && userType === "BUDDY") {
    return BUDDY_PRIVACY_COLLECTION_USE_NOTICE;
  }

  return SIGNUP_AGREEMENT_NOTICES[agreementType];
}
