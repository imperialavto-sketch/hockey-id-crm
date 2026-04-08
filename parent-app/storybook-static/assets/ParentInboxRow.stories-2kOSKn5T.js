import{r as b}from"./index-D9D9kDko.js";import{_ as L,s as D,S as E}from"./animations-D4fvVaQy.js";import{e as h}from"./expoVectorIconsStub-CrdrDYj3.js";import{V as n,c as t,s as v,t as l,a,r as N}from"./theme-eejnxvU2.js";import{M as W,T as o,b as H,c as O,d as j}from"./messagingFixtures-DZ_PBQkX.js";import"./_commonjsHelpers-BosuxZz1.js";import"./client-f6_AiivG.js";const z={chevronMutedIcon:"rgba(255,255,255,0.35)"};function U(u){if(!u||u.trim()==="")return"—";const e=new Date(u);if(Number.isNaN(e.getTime()))return"—";const i=new Date;return e.getDate()===i.getDate()&&e.getMonth()===i.getMonth()&&e.getFullYear()===i.getFullYear()?e.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}):e.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}const V=.88,T=b.memo(function({item:e,index:i,onPress:g}){const P=b.useCallback(()=>g(e),[e,g]),s=e.kind==="coach_mark_ai",p=e.kind==="team_announcements",y=(e.kind==="direct_parent_coach"||e.kind==="team_announcements")&&e.unreadCount>0,k=U(e.updatedAt),B=y&&typeof e.unreadCount=="number"&&e.unreadCount>0?`Непрочитанных сообщений: ${e.unreadCount}`:y?"Есть непрочитанное":"",M=[e.title,e.preview,k,B].filter(Boolean).join(". ");return React.createElement(L.View,{entering:D(E+i*30)},React.createElement(W,{accessibilityRole:"button",accessibilityLabel:M,accessibilityHint:"Открыть переписку",style:({pressed:S})=>[r.row,s?r.rowCoachMark:void 0,p?r.rowTeam:void 0,S?{opacity:V}:void 0],onPress:P},React.createElement(n,{style:[r.avatarWrap,s?r.avatarCoachMark:void 0,p?r.avatarTeam:void 0]},React.createElement(h.Ionicons,{name:s?"sparkles":p?"megaphone-outline":"person",size:22,color:t.accent})),React.createElement(n,{style:r.rowContent},React.createElement(n,{style:r.rowTopLine},React.createElement(n,{style:r.rowTitleBlock},React.createElement(n,{style:r.rowTitleRow},React.createElement(o,{style:[r.title,s?r.titleCoachMark:void 0],numberOfLines:1},e.title),e.showAiBadge?React.createElement(n,{style:r.aiBadge},React.createElement(o,{style:r.aiBadgeText},"AI")):null,y?React.createElement(n,{style:r.unreadDot,accessible:!0,accessibilityRole:"text",accessibilityLabel:typeof e.unreadCount=="number"&&e.unreadCount>0?`Индикатор: ${e.unreadCount} непрочитанных`:"Индикатор непрочитанного"}):null)),React.createElement(o,{style:r.time},k)),React.createElement(o,{style:r.subtitle,numberOfLines:1},e.subtitle),React.createElement(o,{style:r.preview,numberOfLines:2},e.preview)),React.createElement(h.Ionicons,{name:"chevron-forward",size:20,color:z.chevronMutedIcon})))}),r=v.create({row:{flexDirection:"row",alignItems:"center",paddingVertical:a.md,paddingHorizontal:a.md,marginBottom:a.sm+2,backgroundColor:t.surfaceLevel1,borderRadius:N.lg,borderWidth:v.hairlineWidth,borderColor:t.surfaceLevel1Border},rowCoachMark:{backgroundColor:"rgba(59,130,246,0.08)",borderColor:"rgba(59,130,246,0.22)",borderLeftWidth:3,borderLeftColor:t.accent},rowTeam:{borderLeftWidth:3,borderLeftColor:"rgba(148,163,184,0.5)"},avatarWrap:{width:52,height:52,borderRadius:26,backgroundColor:t.accentSoft,borderWidth:v.hairlineWidth,borderColor:"rgba(59,130,246,0.15)",alignItems:"center",justifyContent:"center",marginRight:a.md,alignSelf:"center"},avatarCoachMark:{backgroundColor:"rgba(59,130,246,0.18)",borderColor:"rgba(59,130,246,0.28)"},avatarTeam:{backgroundColor:"rgba(148,163,184,0.12)",borderColor:"rgba(148,163,184,0.25)"},rowContent:{flex:1,minWidth:0},rowTopLine:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:a.sm},rowTitleBlock:{flex:1,minWidth:0},rowTitleRow:{flexDirection:"row",alignItems:"center",gap:a.sm,flexWrap:"nowrap"},title:{...l.cardTitle,fontSize:17,fontWeight:"700",color:t.text,flexShrink:1},titleCoachMark:{color:t.accentBright},aiBadge:{paddingHorizontal:7,paddingVertical:3,borderRadius:6,backgroundColor:"rgba(59,130,246,0.22)",flexShrink:0},aiBadgeText:{fontSize:10,fontWeight:"700",color:t.accentBright,letterSpacing:.4},unreadDot:{width:8,height:8,borderRadius:4,backgroundColor:t.accent,flexShrink:0},subtitle:{...l.caption,fontSize:13,color:t.textSecondary,marginTop:4},preview:{...l.bodySmall,fontSize:14,color:t.textMuted,marginTop:6,lineHeight:20},time:{...l.caption,fontSize:12,color:t.textMuted,marginTop:2,flexShrink:0,opacity:.92}});T.__docgenInfo={description:"",methods:[],displayName:"ParentInboxRow",props:{item:{required:!0,tsType:{name:"union",raw:`| {
    kind: "coach_mark_ai";
    id: typeof COACH_MARK_ID;
    contextPlayerId?: string;
    contextPlayerName?: string;
    title: string;
    subtitle: string;
    preview: string;
    updatedAt: string;
    showAiBadge: true;
    unreadCount: 0;
  }
| {
    kind: "team_announcements";
    id: string;
    teamId: string;
    teamName: string;
    anchorPlayerId: string;
    playersLabel: string;
    title: string;
    subtitle: string;
    preview: string;
    updatedAt: string;
    showAiBadge: false;
    unreadCount: number;
  }
| {
    kind: "direct_parent_coach";
    id: string;
    conversation: ConversationItem;
    title: string;
    subtitle: string;
    preview: string;
    updatedAt: string;
    unreadCount: number;
    showAiBadge: false;
  }`,elements:[{name:"signature",type:"object",raw:`{
  kind: "coach_mark_ai";
  id: typeof COACH_MARK_ID;
  contextPlayerId?: string;
  contextPlayerName?: string;
  title: string;
  subtitle: string;
  preview: string;
  updatedAt: string;
  showAiBadge: true;
  unreadCount: 0;
}`,signature:{properties:[{key:"kind",value:{name:"literal",value:'"coach_mark_ai"',required:!0}},{key:"id",value:{name:"COACH_MARK_ID",required:!0}},{key:"contextPlayerId",value:{name:"string",required:!1}},{key:"contextPlayerName",value:{name:"string",required:!1}},{key:"title",value:{name:"string",required:!0}},{key:"subtitle",value:{name:"string",required:!0}},{key:"preview",value:{name:"string",required:!0}},{key:"updatedAt",value:{name:"string",required:!0}},{key:"showAiBadge",value:{name:"literal",value:"true",required:!0}},{key:"unreadCount",value:{name:"literal",value:"0",required:!0}}]}},{name:"signature",type:"object",raw:`{
  kind: "team_announcements";
  id: string;
  teamId: string;
  teamName: string;
  anchorPlayerId: string;
  playersLabel: string;
  title: string;
  subtitle: string;
  preview: string;
  updatedAt: string;
  showAiBadge: false;
  unreadCount: number;
}`,signature:{properties:[{key:"kind",value:{name:"literal",value:'"team_announcements"',required:!0}},{key:"id",value:{name:"string",required:!0}},{key:"teamId",value:{name:"string",required:!0}},{key:"teamName",value:{name:"string",required:!0}},{key:"anchorPlayerId",value:{name:"string",required:!0}},{key:"playersLabel",value:{name:"string",required:!0}},{key:"title",value:{name:"string",required:!0}},{key:"subtitle",value:{name:"string",required:!0}},{key:"preview",value:{name:"string",required:!0}},{key:"updatedAt",value:{name:"string",required:!0}},{key:"showAiBadge",value:{name:"literal",value:"false",required:!0}},{key:"unreadCount",value:{name:"number",required:!0}}]}},{name:"signature",type:"object",raw:`{
  kind: "direct_parent_coach";
  id: string;
  conversation: ConversationItem;
  title: string;
  subtitle: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
  showAiBadge: false;
}`,signature:{properties:[{key:"kind",value:{name:"literal",value:'"direct_parent_coach"',required:!0}},{key:"id",value:{name:"string",required:!0}},{key:"conversation",value:{name:"ConversationItem",required:!0}},{key:"title",value:{name:"string",required:!0}},{key:"subtitle",value:{name:"string",required:!0}},{key:"preview",value:{name:"string",required:!0}},{key:"updatedAt",value:{name:"string",required:!0}},{key:"unreadCount",value:{name:"number",required:!0}},{key:"showAiBadge",value:{name:"literal",value:"false",required:!0}}]}}]},description:""},index:{required:!0,tsType:{name:"number"},description:"Индекс для stagger-анимации входа."},onPress:{required:!0,tsType:{name:"signature",type:"function",raw:"(item: ParentInboxItem) => void",signature:{arguments:[{type:{name:"union",raw:`| {
    kind: "coach_mark_ai";
    id: typeof COACH_MARK_ID;
    contextPlayerId?: string;
    contextPlayerName?: string;
    title: string;
    subtitle: string;
    preview: string;
    updatedAt: string;
    showAiBadge: true;
    unreadCount: 0;
  }
| {
    kind: "team_announcements";
    id: string;
    teamId: string;
    teamName: string;
    anchorPlayerId: string;
    playersLabel: string;
    title: string;
    subtitle: string;
    preview: string;
    updatedAt: string;
    showAiBadge: false;
    unreadCount: number;
  }
| {
    kind: "direct_parent_coach";
    id: string;
    conversation: ConversationItem;
    title: string;
    subtitle: string;
    preview: string;
    updatedAt: string;
    unreadCount: number;
    showAiBadge: false;
  }`,elements:[{name:"signature",type:"object",raw:`{
  kind: "coach_mark_ai";
  id: typeof COACH_MARK_ID;
  contextPlayerId?: string;
  contextPlayerName?: string;
  title: string;
  subtitle: string;
  preview: string;
  updatedAt: string;
  showAiBadge: true;
  unreadCount: 0;
}`,signature:{properties:[{key:"kind",value:{name:"literal",value:'"coach_mark_ai"',required:!0}},{key:"id",value:{name:"COACH_MARK_ID",required:!0}},{key:"contextPlayerId",value:{name:"string",required:!1}},{key:"contextPlayerName",value:{name:"string",required:!1}},{key:"title",value:{name:"string",required:!0}},{key:"subtitle",value:{name:"string",required:!0}},{key:"preview",value:{name:"string",required:!0}},{key:"updatedAt",value:{name:"string",required:!0}},{key:"showAiBadge",value:{name:"literal",value:"true",required:!0}},{key:"unreadCount",value:{name:"literal",value:"0",required:!0}}]}},{name:"signature",type:"object",raw:`{
  kind: "team_announcements";
  id: string;
  teamId: string;
  teamName: string;
  anchorPlayerId: string;
  playersLabel: string;
  title: string;
  subtitle: string;
  preview: string;
  updatedAt: string;
  showAiBadge: false;
  unreadCount: number;
}`,signature:{properties:[{key:"kind",value:{name:"literal",value:'"team_announcements"',required:!0}},{key:"id",value:{name:"string",required:!0}},{key:"teamId",value:{name:"string",required:!0}},{key:"teamName",value:{name:"string",required:!0}},{key:"anchorPlayerId",value:{name:"string",required:!0}},{key:"playersLabel",value:{name:"string",required:!0}},{key:"title",value:{name:"string",required:!0}},{key:"subtitle",value:{name:"string",required:!0}},{key:"preview",value:{name:"string",required:!0}},{key:"updatedAt",value:{name:"string",required:!0}},{key:"showAiBadge",value:{name:"literal",value:"false",required:!0}},{key:"unreadCount",value:{name:"number",required:!0}}]}},{name:"signature",type:"object",raw:`{
  kind: "direct_parent_coach";
  id: string;
  conversation: ConversationItem;
  title: string;
  subtitle: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
  showAiBadge: false;
}`,signature:{properties:[{key:"kind",value:{name:"literal",value:'"direct_parent_coach"',required:!0}},{key:"id",value:{name:"string",required:!0}},{key:"conversation",value:{name:"ConversationItem",required:!0}},{key:"title",value:{name:"string",required:!0}},{key:"subtitle",value:{name:"string",required:!0}},{key:"preview",value:{name:"string",required:!0}},{key:"updatedAt",value:{name:"string",required:!0}},{key:"unreadCount",value:{name:"number",required:!0}},{key:"showAiBadge",value:{name:"literal",value:"false",required:!0}}]}}]},name:"item"}],return:{name:"void"}}},description:""}}};const X={title:"Messaging/ParentInboxRow",component:T,args:{index:0,onPress:()=>{}},parameters:{docs:{description:{component:"Storybook: инбокс родителя (Vite + react-native-web).\nЗапуск: `npm run storybook` из каталога `parent-app`."}}}},d={name:"Чат с тренером · непрочитанное",args:{item:O}},c={name:"Объявления команды · непрочитанное",args:{item:j}},m={name:"Coach Mark AI",args:{item:H}};var w,C,f;d.parameters={...d.parameters,docs:{...(w=d.parameters)==null?void 0:w.docs,source:{originalSource:`{
  name: "Чат с тренером · непрочитанное",
  args: {
    item: storybookInboxDirectUnread
  }
}`,...(f=(C=d.parameters)==null?void 0:C.docs)==null?void 0:f.source}}};var q,A,I;c.parameters={...c.parameters,docs:{...(q=c.parameters)==null?void 0:q.docs,source:{originalSource:`{
  name: "Объявления команды · непрочитанное",
  args: {
    item: storybookInboxTeam
  }
}`,...(I=(A=c.parameters)==null?void 0:A.docs)==null?void 0:I.source}}};var _,x,R;m.parameters={...m.parameters,docs:{...(_=m.parameters)==null?void 0:_.docs,source:{originalSource:`{
  name: "Coach Mark AI",
  args: {
    item: storybookInboxCoachMark
  }
}`,...(R=(x=m.parameters)==null?void 0:x.docs)==null?void 0:R.source}}};const Z=["DirectCoachUnread","TeamAnnouncementsUnread","CoachMark"];export{m as CoachMark,d as DirectCoachUnread,c as TeamAnnouncementsUnread,Z as __namedExportsOrder,X as default};
