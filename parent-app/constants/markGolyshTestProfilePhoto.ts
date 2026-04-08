import { Image } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const markGolyshProfileAsset = require("../assets/images/mark-golysh-profile.png");

/** Локальный тестовый портрет Голыш Марк — URI для `avatarUrl` (не хардкод в UI). */
export const MARK_GOLYSH_TEST_AVATAR_URI: string =
  Image.resolveAssetSource(markGolyshProfileAsset).uri;
