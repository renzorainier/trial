import React from "react";
import Image from "next/image";
import pic from "../public/skills/pic.jpeg";


function About() {
  return (
    <div id="about" className="w-full md:h-screen p-2 flex items-center py-16">
      <div className="max-w-[1240px] m-auto md:grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <p className="uppercase text-xl tracking-widest text-[#C58940]">
            About
          </p>
          <h2 className="py-4">Who I am</h2>
          <p className="py-2 text-gray-600">
            My name is{" "}
            <span className="text-[#C58940]">Renz Rainier Pasagdan</span>
          </p>
          <p className="py-2 text-gray-600">
        Programming was not really my thing; I was more of an art person. But, I figured, why not give it a shot and teach myself? So, I dove in, and in the past few months, I have fully embraced the challenge, focusing on mastering the basics of programming. As proof of my progress, I have successfully completed several projects, including the website you are currently exploring. Hence, when I started college, I chose computer science, and I am very excited about the journey ahead. Always eager to learn and improve, I cannot wait to earn that degree and become a software engineer someday. That being said, If you think I can help you create a website for business or personal use or any other technical matters, I would be more than happy to take you up on the offer!
          </p>
        </div>
        <div className="w-full h-auto m-auto shadow-lg shadow-[#e8c284] rounded-xl flex items-center justify-center p-4 hover:scale-105 ease-in duration-500">
          <Image
            className="rounded-xl"
            src={pic}
            alt=""
            width="full"
            height="full"
          />
        </div>
      </div>
    </div>
  );
}

export default About;
