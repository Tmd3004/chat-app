import React from "react";
import { useState } from "react";
import FormProvider from "../../../components/hook-form/FormProvider";
import * as Yup from "yup";
import { Link as RouterLink } from "react-router-dom";
// form
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// @mui
import {
  Alert,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Stack,
} from "@mui/material";
// components
import { RHFTextField } from "../../../components/hook-form";
import { useCallback } from "react";

const ProfileForm = () => {
  const ProfileSchema = Yup.object().shape({
    avatarUrl: Yup.string().required("Avatar is required").nullable(true),
    name: Yup.string().required("Name is required"),
    about: Yup.string().required("About is required"),
  });

  const defaultValues = {
    name: "",
    about: "",
  };

  const methods = useForm({
    resolver: yupResolver(ProfileSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = methods;

  const values = watch();
  const handleDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];

      const newFile = Object.assign(file, {
        preview: URL.createObjectURL(file),
      });

      if (file) {
        setValue("avatar", newFile, { shouldValidate: true });
      }
    },
    [setValue]
  );

  const onSubmit = async (data) => {
    try {
      // submit data to backend
      console.log("DATA", data);
    } catch (err) {
      console.error(err);
      reset();
      setError("afterSubmit", {
        ...err,
        message: err.message,
      });
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={4}>
        {!!errors.afterSubmit && (
          <Alert severity="error">{errors.afterSubmit.message}</Alert>
        )}
        <RHFTextField
          name="name"
          label="Name"
          helperText="This name is visible to your contacts"
        />
        <RHFTextField
          name="about"
          label="About"
          multiline
          rows={3}
          maxRows={5}
        />
        <Stack direction="row" justifyContent="end">
          <Button color="primary" size="large" type="submit" variant="outlined">
            Save
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
};

export default ProfileForm;
