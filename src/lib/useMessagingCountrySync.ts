"use client";

import { useRef, useState } from "react";

/**
 * 국적 선택과 메시징 국가번호 선택을 묶어 관리한다.
 * 사용자가 국가번호를 직접 고르기 전까지만 국적 변경을 기본값으로 따라간다.
 */
export function useMessagingCountrySync(initialNationality: string, initialCountry = "US") {
  const [nationality, setNationality] = useState(initialNationality);
  const [messagingCountry, setMessagingCountry] = useState(initialCountry);
  const messagingCountryTouched = useRef(false);

  function handleNationalityChange(code: string) {
    setNationality(code);
    if (!messagingCountryTouched.current) setMessagingCountry(code);
  }

  function handleMessagingCountryChange(code: string) {
    messagingCountryTouched.current = true;
    setMessagingCountry(code);
  }

  return { nationality, messagingCountry, handleNationalityChange, handleMessagingCountryChange };
}
