// 📄 /src/app/invite/[code]/page.tsx

import InviteRedirectPage from "./InviteRedirectClient";

type PageProps = {
  params: {
    code: string;
  };
};

export default function InvitePage(props: any) {
  return <InviteRedirectPage code={props.params.code} />;
}

