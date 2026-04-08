const React = require("react");
const { Text } = require("react-native");

function StubIcon({ name, size, color, style }) {
  return React.createElement(Text, { style: [{ fontSize: size, color }, style] }, String(name ?? ""));
}

const icon = StubIcon;

module.exports = {
  Ionicons: icon,
  AntDesign: icon,
  Entypo: icon,
  EvilIcons: icon,
  Feather: icon,
  FontAwesome: icon,
  FontAwesome5: icon,
  FontAwesome6: icon,
  Fontisto: icon,
  Foundation: icon,
  MaterialCommunityIcons: icon,
  MaterialIcons: icon,
  Octicons: icon,
  SimpleLineIcons: icon,
  Zocial: icon,
};
