BEGIN;

UPDATE "ChatMessage"
SET "conversationId" = 'cmmn6bkok000h10zk1itx576b'
WHERE "conversationId" IN (
  'cmmn8ho08000g12bc67beg4h1',
  'cmmn95n6w000g2nv9tp795e7t'
);

DELETE FROM "ChatConversation"
WHERE id IN (
  'cmmn8ho08000g12bc67beg4h1',
  'cmmn95n6w000g2nv9tp795e7t'
);

DELETE FROM "Parent"
WHERE id IN (
  'cmmmmsxbp000exjt52dt8kfq1',
  'cmmn5e42m0006u5b7j1qb799n',
  'cmmn5ehio0006hz9rjxb67kxz',
  'cmmn8hnz9000412bcmtr7zm1r',
  'cmmn95n6i00042nv943v5c5y7'
);

UPDATE "Parent"
SET phone = NULL
WHERE id = 'cmmmmsxbm000bxjt5zsbhl401';

COMMIT;

-- Verification queries to run manually after execution:
-- SELECT phone, COUNT(*) FROM "Parent" WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*) > 1;
-- SELECT id, "conversationId", "senderType", text FROM "ChatMessage" WHERE "conversationId" = 'cmmn6bkok000h10zk1itx576b' ORDER BY "createdAt";
-- SELECT id, "parentId", "playerId", "coachId" FROM "ChatConversation" WHERE id IN ('cmmn6bkok000h10zk1itx576b', 'cmmn8ho08000g12bc67beg4h1', 'cmmn95n6w000g2nv9tp795e7t');
-- SELECT id, phone, email, "firstName", "lastName" FROM "Parent" WHERE id IN ('cmmn6bko3000410zk3dlwujjx', 'cmmmmsxbp000exjt52dt8kfq1', 'cmmn5e42m0006u5b7j1qb799n', 'cmmn5ehio0006hz9rjxb67kxz', 'cmmn8hnz9000412bcmtr7zm1r', 'cmmn95n6i00042nv943v5c5y7', 'cmmm5q2z50000g6uudypxeopa', 'cmmmmsxbm000bxjt5zsbhl401');
