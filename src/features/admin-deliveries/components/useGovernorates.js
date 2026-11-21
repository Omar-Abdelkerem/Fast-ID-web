import { useQuery } from "@tanstack/react-query";
import { useLocalized } from "@/components";
import { getGovernorates } from "../api";

// governorate code -> localized name, plus the list for a select
export default function useGovernorates() {
  const { localize } = useLocalized();
  const query = useQuery({ queryKey: ["reference", "governorates"], queryFn: getGovernorates, staleTime: Infinity });
  const list = query.data || [];
  const nameOf = (code) => {
    const found = list.find((g) => g.code === code);
    return found ? localize(found.name) : code;
  };
  return { list, nameOf };
}
