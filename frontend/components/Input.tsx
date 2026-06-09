type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-purple-600 ${className}`}
      {...props}
    />
  );
}
