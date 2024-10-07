import Dashboard from './dashboard/page';

export default function Home() {
  console.log(process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID);
  return (
    <div>
      <div>
        <Dashboard />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
