import { BookOpen, History, Library, Search } from "lucide-react";

export const publicNavigation = [
  { to: "/search", label: "Tra cứu pháp luật", icon: Search },
  { to: "/library", label: "Thư viện văn bản", icon: Library },
  { to: "/terms", label: "Từ điển thuật ngữ", icon: BookOpen },
];

export const historyNavigation = {
  to: "/history",
  label: "Lịch sử hỏi đáp",
  icon: History,
};
