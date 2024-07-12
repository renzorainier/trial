import React from "react";
import Image from "next/image";
import Link from "next/link"
import html from "../public/skills/html.png"
import css from "../public/skills/css.png"
import js from "../public/skills/javascript.png"
import python from "../public/skills/python.png"
import c from "../public/skills/c.png"
import cpp from "../public/skills/cpp.png"
import react from "../public/skills/react.png"
import tailwind from "../public/skills/tailwind.png"
import firebase from "../public/skills/firebase.png"
import github from "../public/skills/github1.png"


const Skills = () => {
  return (
    <div id="skills" className="w-full lg:h-screen p-2">
      <div className="max-w-[1240px] mx-auto flex-col justify-center h-full">
        <p className="text-xl tracking-widest uppercase text-[#C58940]">
          Skills
        </p>
        <h2 className="py-4">What can I do</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">


          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={html}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>HTML</h3>
              </div>
            </div>
          </div>
          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={css}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>CSS</h3>
              </div>
            </div>
          </div>
          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={js}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>JavaScript</h3>
              </div>
            </div>
          </div>
          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={python}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>Python</h3>
              </div>
            </div>
          </div>
          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={c}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>C</h3>
              </div>
            </div>
          </div>
                    <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={cpp}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>C++</h3>
              </div>
            </div>
          </div>
          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={react}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>React</h3>
              </div>
            </div>
          </div>
          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={tailwind}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>Tailwindcss</h3>
              </div>
            </div>
          </div>
          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={firebase}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>Firebase</h3>
              </div>
            </div>
          </div>
          <div className="p-6 shadow-xl shadow-[#e8c284] rounded-xl hover:scale-105 ease-in duration-300">
            <div className="grid grid-cols-2 gap-4 justify-center items-center">
              <div className="m-auto">
                <Image
                  src={github}
                  width="64"
                  height="64"
                  alt="/"
                />
              </div>
              <div className="flex flex-col items-center justfify-center">
                <h3>Github</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skills;
