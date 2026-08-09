import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// globals를 끈 구성이라 RTL 자동 cleanup이 등록되지 않으므로 명시적으로 정리한다.
afterEach(() => {
  cleanup();
});

// jsdom은 <dialog>의 showModal/show/close를 구현하지 않으므로 최소 동작을 폴리필한다.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.show ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement, returnValue?: string) {
  if (returnValue !== undefined) this.returnValue = returnValue;
  this.open = false;
  this.dispatchEvent(new Event("close"));
};

// jsdom은 스크롤을 구현하지 않는다. 목록을 맨 위로 되돌리거나 바닥에 붙이는 화면에서 필요하다.
Element.prototype.scrollTo ??= function () {};
Element.prototype.scrollIntoView ??= function () {};
