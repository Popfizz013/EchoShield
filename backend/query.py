"""
Hugging Face Guardrail Model Query Interface
Provides unified interface for querying various safety guardrail models
"""

import os
import requests
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class ModelProvider(Enum):
    """Guardrail model providers"""
    META = "meta"
    IBM = "ibm"
    GOOGLE = "google"
    SERVICENOW = "servicenow"


@dataclass
class ModelConfig:
    """Configuration for a guardrail model"""
    model_id: str
    provider: ModelProvider
    display_name: str
    description: str
    supports_multimodal: bool = False
    size: str = ""  # e.g., "1B", "8B", "12B"


class GuardrailModels:
    """Registry of available guardrail models"""
    
    # Meta Llama Guard Family
    LLAMA_GUARD_4_12B = ModelConfig(
        model_id="meta-llama/Llama-Guard-4-12B",
        provider=ModelProvider.META,
        display_name="Llama Guard 4 (12B)",
        description="Multimodal safeguard model (text + images) for classifying prompts/responses",
        supports_multimodal=True,
        size="12B"
    )
    
    LLAMA_GUARD_3_1B = ModelConfig(
        model_id="meta-llama/Llama-Guard-3-1B",
        provider=ModelProvider.META,
        display_name="Llama Guard 3 (1B)",
        description="Smaller 1B model for content safety classification",
        supports_multimodal=False,
        size="1B"
    )
    
    LLAMA_GUARD_7B = ModelConfig(
        model_id="meta-llama/LlamaGuard-7b",
        provider=ModelProvider.META,
        display_name="Llama Guard (7B)",
        description="Llama 2-based input-output safeguard model",
        supports_multimodal=False,
        size="7B"
    )
    
    # IBM Granite Guardian Family
    GRANITE_GUARDIAN_3_0_2B = ModelConfig(
        model_id="ibm-granite/granite-guardian-3.0-2b",
        provider=ModelProvider.IBM,
        display_name="Granite Guardian 3.0 (2B)",
        description="General harm and dangerous request detector",
        supports_multimodal=False,
        size="2B"
    )

    GRANITE_GUARDIAN_3_1_8B = ModelConfig(
        model_id="ibm-granite/granite-guardian-3.1-8b",
        provider=ModelProvider.IBM,
        display_name="Granite Guardian 3.1 (8B)",
        description="8B model for risk detection and RAG quality checks",
        supports_multimodal=False,
        size="8B"
    )
    
    GRANITE_GUARDIAN_3_2_5B = ModelConfig(
        model_id="ibm-granite/granite-guardian-3.2-5b",
        provider=ModelProvider.IBM,
        display_name="Granite Guardian 3.2 (5B)",
        description="5B thinned version optimized for faster inference",
        supports_multimodal=False,
        size="5B"
    )
    
    GRANITE_GUARDIAN_HAP_38M = ModelConfig(
        model_id="ibm-granite/granite-guardian-hap-38m",
        provider=ModelProvider.IBM,
        display_name="Granite Guardian HAP (38M)",
        description="Compact hate/abuse/profanity detector",
        supports_multimodal=False,
        size="38M"
    )
    
    # Google ShieldGemma Family
    SHIELD_GEMMA_2B = ModelConfig(
        model_id="google/shieldgemma-2b",
        provider=ModelProvider.GOOGLE,
        display_name="ShieldGemma (2B)",
        description="Safety-focused model for content policy classification",
        supports_multimodal=False,
        size="2B"
    )
    
    SHIELD_GEMMA_9B = ModelConfig(
        model_id="google/shieldgemma-9b",
        provider=ModelProvider.GOOGLE,
        display_name="ShieldGemma (9B)",
        description="Larger ShieldGemma for enhanced safety classification",
        supports_multimodal=False,
        size="9B"
    )
    
    SHIELD_GEMMA_27B = ModelConfig(
        model_id="google/shieldgemma-27b",
        provider=ModelProvider.GOOGLE,
        display_name="ShieldGemma (27B)",
        description="Highest capacity ShieldGemma model",
        supports_multimodal=False,
        size="27B"
    )
    
    # ServiceNow
    APRIEL_GUARD = ModelConfig(
        model_id="ServiceNow-AI/AprielGuard",
        provider=ModelProvider.SERVICENOW,
        display_name="AprielGuard",
        description="Safety and adversarial-robustness guardrail with explainable classification",
        supports_multimodal=False,
        size=""
    )
    
    @classmethod
    def get_all_models(cls) -> List[ModelConfig]:
        """Get list of all available models"""
        return [
            cls.LLAMA_GUARD_4_12B,
            cls.LLAMA_GUARD_3_1B,
            cls.LLAMA_GUARD_7B,
            cls.GRANITE_GUARDIAN_3_0_2B,
            cls.GRANITE_GUARDIAN_3_1_8B,
            cls.GRANITE_GUARDIAN_3_2_5B,
            cls.GRANITE_GUARDIAN_HAP_38M,
            cls.SHIELD_GEMMA_2B,
            cls.SHIELD_GEMMA_9B,
            cls.SHIELD_GEMMA_27B,
            cls.APRIEL_GUARD,
        ]
    
    @classmethod
    def get_model_by_id(cls, model_id: str) -> Optional[ModelConfig]:
        """Get model configuration by model ID"""
        for model in cls.get_all_models():
            if model.model_id == model_id:
                return model
        return None
    
    @classmethod
    def get_models_by_provider(cls, provider: ModelProvider) -> List[ModelConfig]:
        """Get all models from a specific provider"""
        return [m for m in cls.get_all_models() if m.provider == provider]


@dataclass
class SafetyClassification:
    """Unified safety classification result"""
    label: str  # "safe" or "unsafe"
    score: float  # confidence score (0-1)
    category: str  # safety category/violation type
    raw_response: Dict  # original API response
    model_id: str  # which model was used


class HuggingFaceGuardrailQuery:
    """
    Unified interface for querying Hugging Face guardrail models
    """
    
    HF_ROUTER_API_URL = "https://router.huggingface.co/hf-inference/models/{model_id}"
    HF_LEGACY_API_URL = "https://api-inference.huggingface.co/models/{model_id}"

    @staticmethod
    def _load_token_from_env_local() -> None:
        if os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN"):
            return

        project_root = Path(__file__).resolve().parent.parent
        env_path = project_root / ".env.local"
        if not env_path.exists():
            return

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key == "HF_TOKEN" and value:
                os.environ.setdefault("HF_TOKEN", value)
            elif key == "HUGGINGFACE_TOKEN" and value:
                os.environ.setdefault("HUGGINGFACE_TOKEN", value)
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the HF guardrail query interface
        
        Args:
            api_key: Hugging Face API token (can also be set via HF_TOKEN env var)
        """
        self._load_token_from_env_local()
        self.api_key = api_key or os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
        if not self.api_key:
            raise ValueError(
                "Hugging Face API token required. Set HF_TOKEN environment variable "
                "or pass api_key parameter."
            )

        self.prefer_local = os.getenv("HF_PREFER_LOCAL", "0").lower() in {"1", "true", "yes"}
        self._local_models: Dict[str, tuple] = {}
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def _get_or_load_local_model(self, model_id: str):
        if model_id in self._local_models:
            return self._local_models[model_id]

        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM

        tokenizer = AutoTokenizer.from_pretrained(model_id, token=self.api_key, trust_remote_code=True)
        dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            token=self.api_key,
            trust_remote_code=True,
            device_map="auto",
            dtype=dtype,
        )
        model.eval()
        self._local_models[model_id] = (tokenizer, model)
        return tokenizer, model

    def _query_model_local(self, prompt: str, model_id: str) -> Dict:
        import torch

        tokenizer, model = self._get_or_load_local_model(model_id)
        messages = [{"role": "user", "content": prompt}]

        try:
            if "granite-guardian" in model_id:
                formatted = tokenizer.apply_chat_template(
                    messages,
                    guardian_config={"risk_name": "harm"},
                    add_generation_prompt=True,
                    tokenize=False,
                )
            else:
                formatted = tokenizer.apply_chat_template(
                    messages,
                    add_generation_prompt=True,
                    tokenize=False,
                )
        except Exception:
            formatted = prompt

        encoded = tokenizer(
            formatted,
            return_tensors="pt",
            return_attention_mask=True,
            truncation=True,
            max_length=2048,
        )
        input_ids = encoded.input_ids.to(model.device)
        attention_mask = encoded.attention_mask.to(model.device)
        input_len = input_ids.shape[1]

        with torch.no_grad():
            output = model.generate(
                input_ids,
                attention_mask=attention_mask,
                do_sample=False,
                max_new_tokens=20,
            )

        generated_text = tokenizer.decode(
            output[:, input_len:][0],
            skip_special_tokens=True,
        ).strip()

        return {
            "generated_text": generated_text,
            "inference_mode": "local",
            "model_id": model_id,
        }

    def _query_model_api(self, prompt: str, model_id: str, timeout: int = 30) -> Dict:
        router_url = self.HF_ROUTER_API_URL.format(model_id=model_id)
        legacy_url = self.HF_LEGACY_API_URL.format(model_id=model_id)

        payload = {
            "inputs": prompt,
            "options": {
                "wait_for_model": True
            }
        }

        router_error: Optional[str] = None

        try:
            response = requests.post(
                router_url,
                headers=self.headers,
                json=payload,
                timeout=timeout
            )
            if response.status_code == 410:
                router_error = "Router endpoint unavailable (410)"
            else:
                response.raise_for_status()
                return response.json()

        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response is not None else -1
            response_text = e.response.text if e.response is not None else str(e)

            if status_code == 401:
                raise ValueError("Invalid Hugging Face API token")
            if status_code == 403:
                raise RuntimeError(
                    "HF token lacks Inference Providers permission for this model. "
                    f"Model: {model_id}"
                )
            if status_code == 404:
                raise ValueError(f"Model not found: {model_id}")
            if status_code == 503:
                raise RuntimeError(f"Model {model_id} is currently loading. Try again in a moment.")

            router_error = f"Router HF API error ({status_code}): {response_text}"

        except requests.exceptions.Timeout:
            raise RuntimeError(f"Request timeout after {timeout}s")

        except Exception as e:
            router_error = f"Router request failed: {str(e)}"

        try:
            response = requests.post(
                legacy_url,
                headers=self.headers,
                json=payload,
                timeout=timeout
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response is not None else -1
            response_text = e.response.text if e.response is not None else str(e)

            if status_code == 401:
                raise ValueError("Invalid Hugging Face API token")
            if status_code == 403:
                raise RuntimeError(
                    "HF token lacks required permissions for model inference. "
                    f"Model: {model_id}"
                )
            if status_code == 404:
                raise ValueError(f"Model not found: {model_id}")
            if status_code == 410:
                raise RuntimeError(
                    "Legacy Hugging Face endpoint is deprecated (410). "
                    f"Router error: {router_error}"
                )
            if status_code == 503:
                raise RuntimeError(f"Model {model_id} is currently loading. Try again in a moment.")

            raise RuntimeError(
                f"HF API error ({status_code}): {response_text}. "
                f"Router error: {router_error}"
            )

        except requests.exceptions.Timeout:
            raise RuntimeError(f"Request timeout after {timeout}s")

        except Exception as e:
            raise RuntimeError(f"Error querying model: {str(e)}. Router error: {router_error}")
    
    def query_model(
        self,
        prompt: str,
        model_id: str,
        timeout: int = 30
    ) -> Dict:
        """
        Query a Hugging Face model via Router API (with legacy fallback)
        
        Args:
            prompt: Text prompt to classify
            model_id: HuggingFace model identifier
            timeout: Request timeout in seconds
            
        Returns:
            Raw API response as dict
        """
        if self.prefer_local:
            return self._query_model_local(prompt, model_id)

        try:
            return self._query_model_api(prompt, model_id, timeout=timeout)
        except RuntimeError as error:
            message = str(error)
            if "lacks Inference Providers permission" in message or "deprecated (410)" in message:
                return self._query_model_local(prompt, model_id)
            raise
    
    def _parse_llama_guard_response(self, response: Dict, model_id: str) -> SafetyClassification:
        """Parse Llama Guard model response"""
        # Llama Guard returns text with classification
        # Format: "safe" or "unsafe\n<category>"
        
        if isinstance(response, list) and len(response) > 0:
            generated_text = response[0].get("generated_text", "").lower().strip()
        elif isinstance(response, dict):
            generated_text = response.get("generated_text", "").lower().strip()
        else:
            generated_text = str(response).lower()
        
        is_safe = "safe" in generated_text and "unsafe" not in generated_text
        
        # Extract category if unsafe
        category = "none"
        if not is_safe:
            lines = generated_text.split("\n")
            if len(lines) > 1:
                category = lines[1].strip()
        
        return SafetyClassification(
            label="safe" if is_safe else "unsafe",
            score=0.1 if is_safe else 0.9,  # Binary classification
            category=category,
            raw_response=response,
            model_id=model_id
        )
    
    def _parse_granite_guardian_response(self, response: Dict, model_id: str) -> SafetyClassification:
        """Parse Granite Guardian model response"""
        if isinstance(response, list) and len(response) > 0:
            result = response[0]
        else:
            result = response

        generated_text = str(result.get("generated_text", "")).strip()
        generated_text_lower = generated_text.lower()

        if generated_text_lower.startswith("yes"):
            is_risky = True
            score = 0.9
        elif generated_text_lower.startswith("no"):
            is_risky = False
            score = 0.1
        else:
            is_risky = any(keyword in generated_text_lower for keyword in ["risk", "unsafe", "violation", "harmful", "yes"])
            score = 0.85 if is_risky else 0.15
        
        # Try to extract category
        category = "general"
        if "hate" in generated_text_lower or "abuse" in generated_text_lower:
            category = "hate_speech"
        elif "profanity" in generated_text_lower:
            category = "profanity"
        elif "violence" in generated_text_lower:
            category = "violence"
        
        return SafetyClassification(
            label="unsafe" if is_risky else "safe",
            score=score,
            category=category,
            raw_response=response,
            model_id=model_id
        )
    
    def _parse_shield_gemma_response(self, response: Dict, model_id: str) -> SafetyClassification:
        """Parse ShieldGemma model response"""
        # ShieldGemma returns policy violation classifications
        
        if isinstance(response, list) and len(response) > 0:
            result = response[0]
        else:
            result = response
        
        generated_text = result.get("generated_text", "").lower()
        
        # ShieldGemma classifies against various policies
        is_safe = "yes" not in generated_text or "no" in generated_text
        
        # Determine category based on keywords
        category = "general"
        if "hate" in generated_text:
            category = "hate_speech"
        elif "harassment" in generated_text:
            category = "harassment"
        elif "dangerous" in generated_text or "violence" in generated_text:
            category = "dangerous_content"
        
        return SafetyClassification(
            label="safe" if is_safe else "unsafe",
            score=0.1 if is_safe else 0.88,
            category=category,
            raw_response=response,
            model_id=model_id
        )
    
    def _parse_apriel_guard_response(self, response: Dict, model_id: str) -> SafetyClassification:
        """Parse AprielGuard model response"""
        
        if isinstance(response, list) and len(response) > 0:
            result = response[0]
        else:
            result = response
        
        generated_text = result.get("generated_text", "").lower()
        
        # AprielGuard provides reasoning and classification
        is_safe = "safe" in generated_text and "unsafe" not in generated_text
        
        category = "general"
        if "adversarial" in generated_text:
            category = "adversarial_attack"
        elif "jailbreak" in generated_text:
            category = "jailbreak_attempt"
        
        return SafetyClassification(
            label="safe" if is_safe else "unsafe",
            score=0.12 if is_safe else 0.87,
            category=category,
            raw_response=response,
            model_id=model_id
        )
    
    def classify_prompt(
        self,
        prompt: str,
        model_id: str
    ) -> SafetyClassification:
        """
        Classify a prompt for safety using specified model
        
        Args:
            prompt: Text prompt to classify
            model_id: Hugging Face model ID to use
            
        Returns:
            Unified SafetyClassification result
        """
        # Query the model
        raw_response = self.query_model(prompt, model_id)
        
        # Parse based on model type
        model_config = GuardrailModels.get_model_by_id(model_id)
        
        if not model_config:
            # Unknown model, generic parsing
            return SafetyClassification(
                label="unknown",
                score=0.5,
                category="unknown",
                raw_response=raw_response,
                model_id=model_id
            )
        
        # Route to appropriate parser
        if model_config.provider == ModelProvider.META:
            return self._parse_llama_guard_response(raw_response, model_id)
        elif model_config.provider == ModelProvider.IBM:
            return self._parse_granite_guardian_response(raw_response, model_id)
        elif model_config.provider == ModelProvider.GOOGLE:
            return self._parse_shield_gemma_response(raw_response, model_id)
        elif model_config.provider == ModelProvider.SERVICENOW:
            return self._parse_apriel_guard_response(raw_response, model_id)
        else:
            return SafetyClassification(
                label="unknown",
                score=0.5,
                category="unknown",
                raw_response=raw_response,
                model_id=model_id
            )
    
    def batch_classify(
        self,
        prompts: List[str],
        model_id: str
    ) -> List[SafetyClassification]:
        """
        Classify multiple prompts (sequentially for now)
        
        Args:
            prompts: List of prompts to classify
            model_id: Model to use for classification
            
        Returns:
            List of SafetyClassification results
        """
        return [self.classify_prompt(prompt, model_id) for prompt in prompts]


def create_safety_evaluator(model_id: str, api_key: Optional[str] = None):
    """
    Factory function to create a safety evaluator for use with EchoGram engine
    
    Args:
        model_id: HuggingFace model ID to use
        api_key: Optional API key (uses env var if not provided)
        
    Returns:
        Callable evaluator function compatible with EchoGram search
    """
    query_interface = HuggingFaceGuardrailQuery(api_key=api_key)
    
    def evaluate(prompt: str) -> Dict:
        """Evaluate prompt safety"""
        result = query_interface.classify_prompt(prompt, model_id)
        
        # Return dict format expected by EchoGram
        return {
            "label": result.label,
            "score": result.score,
            "category": result.category
        }
    
    return evaluate


if __name__ == "__main__":
    # Example usage
    print("=" * 70)
    print("HuggingFace Guardrail Query Interface - Demo")
    print("=" * 70)
    
    # List available models
    print("\nAvailable Models:")
    print("-" * 70)
    for model in GuardrailModels.get_all_models():
        print(f"\n{model.display_name} ({model.size})")
        print(f"  ID: {model.model_id}")
        print(f"  Provider: {model.provider.value}")
        print(f"  Description: {model.description}")
    
    print("\n" + "=" * 70)
    print("\nTo use this interface:")
    print("1. Set your HF_TOKEN environment variable")
    print("2. Create an instance: query = HuggingFaceGuardrailQuery()")
    print("3. Classify: result = query.classify_prompt('test prompt', model_id)")
    print("\nOr use with EchoGram engine:")
    print("  evaluator = create_safety_evaluator('meta-llama/Llama-Guard-3-1B')")
    print("  search = EchogramSearch(safety_eval=evaluator)")
