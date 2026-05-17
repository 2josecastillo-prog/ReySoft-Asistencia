from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from app.utils.names import compose_full_name, normalize_name_part, split_full_name


class NamePartsBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    middle_name: str | None = Field(default=None, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    second_surname: str | None = Field(default=None, max_length=80)

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_full_name(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if data.get("full_name") and not data.get("first_name") and not data.get("last_name"):
            next_data = dict(data)
            next_data.update(split_full_name(str(data["full_name"])))
            return next_data
        return data

    @field_validator("first_name", "last_name")
    @classmethod
    def clean_required_name(cls, value: str) -> str:
        cleaned = normalize_name_part(value)
        if not cleaned:
            raise ValueError("Este campo es obligatorio.")
        return cleaned

    @field_validator("middle_name", "second_surname")
    @classmethod
    def clean_optional_name(cls, value: str | None) -> str | None:
        return normalize_name_part(value)


class OptionalNamePartsBase(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    middle_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    second_surname: str | None = Field(default=None, max_length=80)

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_full_name(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if data.get("full_name"):
            next_data = dict(data)
            next_data.update(split_full_name(str(data["full_name"])))
            return next_data
        return data

    @field_validator("first_name", "middle_name", "last_name", "second_surname")
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        return normalize_name_part(value)


class NamePartsResponse(BaseModel):
    first_name: str
    middle_name: str | None = None
    last_name: str
    second_surname: str | None = None
    full_name: str


def legacy_admin_full_name_to_parts(data: Any) -> Any:
    if not isinstance(data, dict):
        return data
    if data.get("admin_full_name") and not data.get("admin_first_name") and not data.get("admin_last_name"):
        parts = split_full_name(str(data["admin_full_name"]))
        next_data = dict(data)
        next_data["admin_first_name"] = parts["first_name"]
        next_data["admin_middle_name"] = parts["middle_name"]
        next_data["admin_last_name"] = parts["last_name"]
        next_data["admin_second_surname"] = parts["second_surname"]
        return next_data
    return data


def compose_admin_full_name(
    first_name: str,
    middle_name: str | None,
    last_name: str,
    second_surname: str | None,
) -> str:
    return compose_full_name(first_name, middle_name, last_name, second_surname)
