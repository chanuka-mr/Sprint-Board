"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const PasswordInput: React.FC<PasswordInputProps> = (props) => {
  const [show, setShow] = useState(false);

  const { className, ...rest } = props;

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-board-400" />
      <input
        {...rest}
        type={show ? "text" : "password"}
        className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm text-board-900 outline-none transition-colors focus:ring-2 ${
          className ?? ""
        }`}
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-board-400 transition-colors hover:text-board-600 dark:hover:text-board-600"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={-1}
      >
        {show ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

export default PasswordInput;