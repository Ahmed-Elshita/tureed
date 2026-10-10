// Shapes shared by the client components. The trees come from the public
// APIs (/api/categories, /api/locations) and can be ANY depth.
export interface TreeNode {
  id: string;
  nameAr: string;
  nameEn: string;
  slug?: string;
  children?: TreeNode[];
}

export type AttributeInputType = "SELECT" | "MULTISELECT" | "NUMBER" | "BOOLEAN";

export interface AttributeOptionDTO {
  id: string;
  labelAr: string;
  labelEn: string;
}

export interface CategoryAttributeDTO {
  id: string;
  labelAr: string;
  labelEn: string;
  inputType: AttributeInputType;
  isRequired: boolean;
  isFilterable: boolean;
  options: AttributeOptionDTO[];
}
