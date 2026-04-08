import React from "react";
import renderer from "react-test-renderer";
import { NotificationCard } from "@/components/messaging/NotificationCard";
import {
  storybookNotificationChat,
  storybookNotificationRead,
} from "@/test-fixtures/messagingFixtures";

const noop = () => {};

describe("NotificationCard snapshots", () => {
  it("unread chat_message", () => {
    const tree = renderer
      .create(<NotificationCard item={storybookNotificationChat} onPress={noop} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("read chat_message", () => {
    const tree = renderer
      .create(<NotificationCard item={storybookNotificationRead} onPress={noop} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
