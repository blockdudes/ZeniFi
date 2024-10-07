import React from "react";
import UserStats from "@/components/UserStats";
import FormButtons from "@/components/FormButtons";

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-100">
      <div className="bg-black/[0.6] p-6 rounded-3xl shadow-md border border-gray-600 w-full max-w-4xl mx-auto">
        <div className="h-[580px] flex flex-col md:flex-row justify-between items-center ">
          <div className="flex p-6 rounded-lg w-full">
            <UserStats />
          </div>
          <div>
            <FormButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
export const dynamic = "force-dynamic";
