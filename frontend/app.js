const $ = (s) => document.querySelector(s);
const articles = [
  {
    id: "1",
    category: "general",
    label: "Quy định chung",
    title: "Điều 1. Phạm vi điều chỉnh và đối tượng áp dụng",
    summary:
      "Quy định về an ninh mạng, bảo vệ an ninh mạng và các chủ thể thuộc phạm vi áp dụng của Luật.",
    text: "1. Luật này quy định về an ninh mạng, bảo vệ an ninh mạng; quyền, nghĩa vụ, trách nhiệm của cơ quan, tổ chức, cá nhân có liên quan.",
    note: "Trích khoản 1. Mở nguồn để đọc toàn bộ Điều 1.",
  },
  {
    id: "2",
    category: "definition",
    label: "Khái niệm",
    title: "Điều 2. Giải thích từ ngữ",
    summary:
      "Tra cứu khái niệm an ninh mạng và các thuật ngữ được sử dụng trong văn bản luật.",
    text: "1. An ninh mạng là sự ổn định, an ninh, an toàn của không gian mạng; bảo vệ hệ thống thông tin và bảo đảm thông tin, dữ liệu, hoạt động trên không gian mạng không gây phương hại đến an ninh quốc gia, trật tự, an toàn xã hội, quyền và lợi ích hợp pháp của cơ quan, tổ chức, cá nhân.",
    note: "Trích khoản 1. Mở nguồn để đọc toàn bộ Điều 2.",
  },
  {
    id: "44",
    category: "effect",
    label: "Hiệu lực thi hành",
    title: "Điều 44. Hiệu lực thi hành",
    summary:
      "Thời điểm Luật An ninh mạng số 116/2025/QH15 có hiệu lực và quy định về các văn bản hết hiệu lực.",
    text: "1. Luật này có hiệu lực thi hành từ ngày 01 tháng 7 năm 2026.\n\n2. Luật An toàn thông tin mạng số 86/2015/QH13 đã được sửa đổi, bổ sung một số điều theo Luật số 35/2018/QH14; Luật An ninh mạng số 24/2018/QH14 hết hiệu lực kể từ ngày Luật này có hiệu lực thi hành.",
    note: "Điều 44, bản PDF 37 trang, trang 36.",
  },
];
const source =
  "https://chinhphu.vn/?classid=1&docid=216499&orggroupid=1&pageid=27160";
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
function renderResults(items) {
  $("#result-count").innerHTML =
    `Tìm thấy <strong>${items.length} kết quả</strong>`;
  $("#results").innerHTML = items.length
    ? items
        .map(
          (a) =>
            `<article class="result"><div class="result-icon"><svg><use href="#i-file"/></svg></div><div class="result-body"><div class="result-top"><span class="result-category">${a.label.toUpperCase()}</span><span class="result-doc">· &nbsp;116/2025/QH15</span></div><h3>${a.title}</h3><p>${a.summary}</p><div class="result-bottom"><span class="result-meta">Ban hành: 10/12/2025 &nbsp;·&nbsp; Quốc hội</span><button class="link-button" data-article="${a.id}">Xem điều khoản <svg><use href="#i-arrow"/></svg></button></div></div></article>`,
        )
        .join("")
    : '<div class="empty-state"><h3>Chưa tìm thấy kết quả phù hợp</h3><p>Thử từ khóa “an ninh mạng”, “khái niệm” hoặc “Điều 44”.<br>Bản giao diện hiện minh họa 3 điều luật.</p></div>';
}
function search() {
  const from = $("#date-from").value,
    to = $("#date-to").value;
  $("#search-error").hidden = true;
  if (from && to && from > to) {
    $("#search-error").textContent =
      "Ngày bắt đầu cần trước hoặc bằng ngày kết thúc.";
    $("#search-error").hidden = false;
    return;
  }
  const q = normalize($("#query").value.trim());
  const type = $("#content-type").value;
  const mode = $("#search-mode").value;
  const issued = "2025-12-10";
  const items = articles.filter((a) => {
    if (type !== "all" && a.category !== type) return false;
    if ((from && issued < from) || (to && issued > to)) return false;
    if (!q) return true;
    if (mode === "article") return a.id === q.replace(/dieu\s*/, "").trim();
    const target = normalize(
      mode === "title"
        ? a.title
        : [a.title, a.text, a.summary, a.label].join(" "),
    );
    return (
      target.includes(q) ||
      (q.match(/^dieu\s*\d+$/) && a.id === q.replace(/dieu\s*/, ""))
    );
  });
  renderResults(items);
}
$("#search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  search();
});
$("#query").addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    search();
  }
});
$(".brand").addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelector('[data-view="search"]').click();
});
$("#reset").addEventListener("click", () => {
  $("#search-form").reset();
  $("#query").value = "";
  $("#search-error").hidden = true;
  renderResults(articles);
});
function articleMarkup(a) {
  return `<p class="document-meta">LUẬT SỐ 116/2025/QH15 · NGUYÊN VĂN TRÍCH ĐOẠN</p><h2>${a.title}</h2>${a.text
    .split("\n\n")
    .map((t) => `<p>${t}</p>`)
    .join(
      "",
    )}<p class="document-meta">${a.note}</p><a href="${source}" target="_blank" rel="noopener noreferrer">Đối chiếu văn bản trên Cổng thông tin Chính phủ ↗</a>`;
}
const dialog = $("#article-dialog");
let dialogTrigger = null;
document.addEventListener("click", (e) => {
  const art = e.target.closest("[data-article]");
  if (art) {
    const a = articles.find((x) => x.id === art.dataset.article);
    if (art.closest(".article-nav"))
      $("#library-detail").innerHTML = articleMarkup(a);
    else {
      dialogTrigger = art;
      $("#article-content").innerHTML = articleMarkup(a);
      dialog.showModal();
    }
  }
  const suggestion = e.target.closest("[data-query]");
  if (suggestion) {
    $("#query").value = suggestion.dataset.query;
    $("#content-type").value = "all";
    $("#search-mode").value = "all";
    search();
  }
  const view = e.target.closest("[data-view]");
  if (view) {
    document
      .querySelectorAll(".view")
      .forEach((v) => (v.hidden = v.id !== `view-${view.dataset.view}`));
    document.querySelectorAll("[data-view]").forEach((b) => {
      b.classList.toggle("selected", b === view);
      b.removeAttribute("aria-current");
    });
    view.setAttribute("aria-current", "page");
    $("#breadcrumb").textContent = view.textContent.trim();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  if (e.target.closest("[data-chat]")) openChat();
  const prompt = e.target.closest("[data-chat-prompt]");
  if (prompt) {
    $("#chat-input").value = prompt.dataset.chatPrompt;
    sendChat();
  }
});
$("#close-article").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => dialogTrigger?.focus());
$("#library-detail").innerHTML = articleMarkup(articles[0]);
function openChat() {
  $("#chat-panel").hidden = false;
  $("#chat-launcher").setAttribute("aria-expanded", "true");
  $("#chat-input").focus();
}
function closeChat() {
  $("#chat-panel").hidden = true;
  $("#chat-launcher").setAttribute("aria-expanded", "false");
  $("#chat-launcher").focus();
}
$("#chat-launcher").addEventListener("click", () =>
  $("#chat-panel").hidden ? openChat() : closeChat(),
);
$("#close-chat").addEventListener("click", closeChat);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !dialog.open && !$("#chat-panel").hidden)
    closeChat();
});
function addMessage(text, kind) {
  const div = document.createElement("div");
  div.className = `message ${kind}`;
  div.textContent = text;
  $("#chat-messages").append(div);
  $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
  return div;
}
function sendChat() {
  const question = $("#chat-input").value.trim();
  if (!question) return;
  addMessage(question, "user");
  $("#chat-input").value = "";
  let answer =
    "Đây là bản xem thử giao diện, chưa kết nối mô hình AI. Bạn có thể thử “Luật có hiệu lực từ khi nào?” hoặc “An ninh mạng là gì?” để xem cách hiển thị câu trả lời và căn cứ.";
  let a = null;
  const q = normalize(question);
  if (q.includes("hieu luc")) {
    answer =
      "Phản hồi mẫu: Luật số 116/2025/QH15 có hiệu lực từ ngày 01/07/2026. Căn cứ: khoản 1 Điều 44.";
    a = articles[2];
  } else if (q.includes("an ninh mang la gi")) {
    answer =
      "Phản hồi mẫu: Khái niệm an ninh mạng được nêu tại khoản 1 Điều 2. Bạn có thể mở nguyên văn bên dưới để đọc đầy đủ.";
    a = articles[1];
  }
  const response = addMessage(answer, "assistant");
  if (a) {
    const p = document.createElement("p");
    const b = document.createElement("button");
    b.className = "link-button";
    b.dataset.article = a.id;
    b.textContent = `Mở Điều ${a.id}`;
    p.append(b);
    response.append(p);
  }
  $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
}
$("#chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  sendChat();
});
renderResults(articles);
