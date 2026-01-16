"use client";
import { Button } from "@repo/share-ui/components/reui/button";
import Image, { type ImageProps } from "next/image";

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-center py-2 bg-gray-100 min-h-screen">
			<h1 className="text-4xl font-bold mb-8">Welcome to the Test Web App</h1>
			<div className="flex flex-col">
				<div className="mb-8">
					<Image src="next.svg" alt="Next.js Logo" width={200} height={100} />
				</div>
				<Button variant="primary" onClick={() => alert("Button clicked!")}>
					Click Me
				</Button>
			</div>
		</div>
	);
}
