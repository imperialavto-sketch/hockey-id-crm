import React from "react";
import renderer from "react-test-renderer";
import { View } from "react-native";
import { ParentInboxRow } from "@/components/messaging/ParentInboxRow";
import {
  storybookInboxCoachMark,
  storybookInboxDirectUnread,
  storybookInboxTeam,
} from "@/test-fixtures/messagingFixtures";

const noop = () => {};

describe("Parent inbox list snapshot", () => {
  it("three rows: Arena AI, team, direct coach", () => {
    const tree = renderer
      .create(
        <View>
          <ParentInboxRow item={storybookInboxCoachMark} index={0} onPress={noop} />
          <ParentInboxRow item={storybookInboxTeam} index={1} onPress={noop} />
          <ParentInboxRow item={storybookInboxDirectUnread} index={2} onPress={noop} />
        </View>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
