(() => {
  const root = document.getElementById("cyberlaw-design");
  const q = root.querySelector("#cl-question");
  const detail = root.querySelector("#cl-detail");
  const examples = {
    date: "Luật An ninh mạng 2025 có hiệu lực từ khi nào?",
    old: "Luật An ninh mạng 2018 còn hiệu lực sau 01/07/2026 không?",
    fine: "Tôi bị phạt bao nhiêu tiền?",
  };
  root.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      root
        .querySelectorAll("[data-view]")
        .forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
      root
        .querySelectorAll("[data-panel]")
        .forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.view));
    }),
  );
  root.querySelectorAll("[data-example]").forEach((b) =>
    b.addEventListener("click", () => {
      q.value = examples[b.dataset.example];
      q.focus();
    }),
  );
  root.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = q.value.trim();
    let status = "Chưa có dữ liệu trong mẫu",
      answer =
        "Mẫu giao diện chỉ hỗ trợ ba câu hỏi gợi ý. Hệ thống thực tế sẽ tra cứu trong toàn bộ văn bản đã nhập.",
      ref = "",
      quote = "";
    if (!v) {
      status = "Cần nhập câu hỏi";
      answer = "Hãy nhập câu hỏi hoặc từ khóa để tra cứu.";
    } else if (v === examples.date) {
      status = "Có căn cứ trong văn bản";
      answer =
        "Luật An ninh mạng số 116/2025/QH15 có hiệu lực từ ngày 01/07/2026.";
      ref = "Khoản 1 Điều 44 · Hiệu lực thi hành";
      quote = "1. Luật này có hiệu lực thi hành từ ngày 01 tháng 7 năm 2026.";
    } else if (v === examples.old) {
      status = "Có căn cứ trong văn bản";
      answer =
        "Theo khoản 2 Điều 44, Luật An ninh mạng số 24/2018/QH14 hết hiệu lực kể từ ngày luật năm 2025 có hiệu lực (01/07/2026).";
      ref = "Khoản 2 Điều 44 · Hiệu lực thi hành";
      quote =
        "2. Luật An toàn thông tin mạng số 86/2015/QH13 đã được sửa đổi, bổ sung một số điều theo Luật số 35/2018/QH14; Luật An ninh mạng số 24/2018/QH14 hết hiệu lực kể từ ngày Luật này có hiệu lực thi hành.";
    } else if (v === examples.fine) {
      status = "Cần bổ sung dữ kiện";
      answer =
        "Bạn đang hỏi về hành vi nào? Mẫu hiện chưa có căn cứ để xác định mức phạt.";
    }
    root.querySelector("#cl-status").textContent = status;
    root.querySelector("#cl-answer").textContent = answer;
    root.querySelector("#cl-citation").hidden = !ref;
    root.querySelector("#cl-ref").textContent = ref;
    root.querySelector("#cl-quote").textContent = quote;
    detail.hidden = !ref;
  });
  root.querySelector("#cl-open").addEventListener("click", () => {
    detail.hidden = false;
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  const design = { compact: false };
  if (globalThis.Tweak) {
    const tweak = new Tweak({
      container: root,
      onChange: () => {
        root.querySelector("main").style.padding = design.compact
          ? "16px"
          : "26px";
      },
    });
    tweak.addToggle(design, "compact", { label: "Bố cục gọn" });
  }
})();
