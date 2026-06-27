const ERP = (() => {
    const schema = {
        condicoes_pagamento: {
            title: "Condições de Pagamento",
            sing: "Condição de Pagamento",
            icon: "fa-solid fa-credit-card",
            fields: [
                ["nome", "Descrição", "text"],
                ["parcelas", "Qtd. de Parcelas", "number"],
                ["dias_intervalo", "Intervalo (Dias)", "number"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        contas_pagar: {
            title: "Contas a Pagar",
            sing: "Conta a Pagar",
            icon: "fa-solid fa-file-invoice-dollar",
            fields: [
                ["descricao", "Descrição do Documento", "text"],
                ["valor_total", "Valor Total", "number"],
                ["data_vencimento", "Data de Vencimento", "date"],
                ["id_condicao", "Condição de Pagamento", "text"], // Pode evoluir para um "select" dinâmico se seu backend der suporte
                ["status", "Situação", "select:Pendente|Pago|Cancelado"]
            ]
        },

        paises: {
            title: "Países",
            sing: "País",
            icon: "fa-globe",
            fields: [
                ["nome", "Nome", "text"],
                ["sigla", "Sigla", "text"],
                ["ddi", "DDI", "text"],
                ["moeda", "Moeda", "text"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        estados: {
            title: "Estados",
            sing: "Estado",
            icon: "fa-map",
            fields: [
                ["paisId", "País", "rel:paises:nome"],
                ["nome", "Nome", "text"],
                ["uf", "UF", "text"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        cidades: {
            title: "Cidades",
            sing: "Cidade",
            icon: "fa-city",
            fields: [
                ["paisId", "País", "rel:paises:nome"],
                ["estadoId", "Estado", "rel:estados:nome"],
                ["nome", "Nome", "text"],
                ["codigoIbge", "Código IBGE", "text"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        enderecos: {
            title: "Endereços",
            sing: "Endereço",
            icon: "fa-location-dot",
            fields: [
                ["paisId", "País", "rel:paises:nome"],
                ["estadoId", "Estado", "rel:estados:nome"],
                ["cidadeId", "Cidade", "rel:cidades:nome"],
                ["logradouro", "Logradouro", "text"],
                ["numero", "Número", "text"],
                ["bairro", "Bairro", "text"],
                ["cep", "CEP", "text"],
                ["complemento", "Complemento", "text"]
            ]
        },

        informacoes: {
            title: "Informações",
            sing: "Informação",
            icon: "fa-circle-info",
            fields: [
                ["telefone", "Telefone", "tel"],
                ["email", "E-mail", "email"],
                ["documento", "CPF/CNPJ", "text"],
                ["observacao", "Observação", "textarea"]
            ]
        },

        clientes: {
            title: "Clientes",
            sing: "Cliente",
            icon: "fa-users",
            fields: [
                ["nome", "Nome/Razão Social", "text"],
                ["tipo", "Tipo", "select:Física|Jurídica"],
                ["enderecoId", "Endereço", "rel:enderecos:logradouro"],
                ["informacaoId", "Informação", "rel:informacoes:email"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        fornecedores: {
            title: "Fornecedores",
            sing: "Fornecedor",
            icon: "fa-truck-field",
            fields: [
                ["nome", "Nome/Razão Social", "text"],
                ["categoria", "Categoria", "text"],
                ["enderecoId", "Endereço", "rel:enderecos:logradouro"],
                ["informacaoId", "Informação", "rel:informacoes:email"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        produtos: {
            title: "Produtos",
            sing: "Produto",
            icon: "fa-box",
            fields: [
                ["nome", "Nome", "text"],
                ["sku", "SKU", "text"],
                ["categoria", "Categoria", "text"],
                ["preco", "Preço", "number"],
                ["estoque", "Estoque", "number"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        modelos: {
            title: "Modelos",
            sing: "Modelo",
            icon: "fa-tags",
            fields: [
                ["nome", "Modelo", "text"],
                ["marca", "Marca", "text"],
                ["descricao", "Descrição", "textarea"],
                ["ano", "Ano", "number"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        veiculos: {
            title: "Veículos",
            sing: "Veículo",
            icon: "fa-car",
            fields: [
                ["modeloId", "Modelo", "rel:modelos:nome"],
                ["marcaAuto", "Marca", "readonly"],
                ["descricaoAuto", "Descrição", "readonly"],
                ["anoAuto", "Ano", "readonly"],
                ["placa", "Placa", "text"],
                ["renavam", "Renavam", "text"],
                ["cor", "Cor", "text"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        },

        transportadores: {
            title: "Transportadores",
            sing: "Transportador",
            icon: "fa-truck-fast",
            fields: [
                ["nome", "Nome/Razão Social", "text"],
                ["tipoFrete", "Tipo de Frete", "select:CIF|FOB|Próprio"],
                ["enderecoId", "Endereço", "rel:enderecos:logradouro"],
                ["informacaoId", "Informação", "rel:informacoes:email"],
                ["status", "Status", "select:Ativo|Inativo"]
            ]
        }
    };

    const fieldMap = {
        paisId: "pais_id",
        estadoId: "estado_id",
        cidadeId: "cidade_id",
        enderecoId: "endereco_id",
        informacaoId: "informacao_id",
        modeloId: "modelo_id",
        codigoIbge: "codigo_ibge",
        tipoFrete: "tipo_frete",
        marcaAuto: "marca",
        descricaoAuto: "descricao",
        anoAuto: "ano"
    };

    const cache = {
        paises: [],
        estados: [],
        cidades: [],
        enderecos: [],
        informacoes: [],
        clientes: [],
        fornecedores: [],
        produtos: [],
        modelos: [],
        veiculos: [],
        transportadores: []
    };

    function initBase() {
        const toggleSidebar = document.getElementById("toggleSidebar");

        if (toggleSidebar) {
            toggleSidebar.addEventListener("click", () => {
                const sidebar = document.getElementById("sidebar");

                if (!sidebar) {
                    return;
                }

                if (window.innerWidth < 900) {
                    sidebar.classList.toggle("mobile-open");
                } else {
                    sidebar.classList.toggle("collapsed");
                }
            });
        }

        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((elemento) => {
            new bootstrap.Tooltip(elemento);
        });
    }

    function frontToApiKey(key) {
        return fieldMap[key] || key;
    }

    function apiToFrontKey(key) {
        const encontrado = Object.entries(fieldMap).find((item) => item[1] === key);
        return encontrado ? encontrado[0] : key;
    }

    function normalizarRegistroApi(registro) {
        const novoRegistro = {};

        Object.entries(registro || {}).forEach(([key, value]) => {
            novoRegistro[apiToFrontKey(key)] = value;
        });

        if (registro && registro.id !== undefined) {
            novoRegistro.id = registro.id;
        }

        return novoRegistro;
    }

    function montarPayloadApi(obj) {
        const payload = {};

        Object.entries(obj).forEach(([key, value]) => {
            const apiKey = frontToApiKey(key);
            payload[apiKey] = value === "" ? null : value;
        });

        return payload;
    }

    async function buscarApi(entity) {
        const resposta = await fetch(`/api/${entity}`);

        if (!resposta.ok) {
            let mensagemErro = `Erro ao buscar ${entity}.`;

            try {
                const dadosErro = await resposta.json();
                mensagemErro = dadosErro.mensagem || mensagemErro;
            } catch (erroJson) {
                console.warn("Erro ao ler resposta JSON:", erroJson);
            }

            throw new Error(mensagemErro);
        }

        const dados = await resposta.json();

        const registros = Array.isArray(dados)
            ? dados
            : dados.registros || dados.dados || [];

        cache[entity] = registros.map(normalizarRegistroApi);

        return cache[entity];
    }

    async function carregarDependencia(entity) {
        try {
            return await buscarApi(entity);
        } catch (erro) {
            console.warn(`Não foi possível carregar ${entity}:`, erro.message);
            cache[entity] = [];
            return [];
        }
    }

    async function carregarDependenciasDoFormulario(entity) {
        const fields = schema[entity].fields;

        const entidadesRelacionadas = fields
            .filter((field) => field[2].startsWith("rel:"))
            .map((field) => field[2].split(":")[1]);

        const entidadesUnicas = [...new Set(entidadesRelacionadas)];

        for (const entidadeRelacionada of entidadesUnicas) {
            await carregarDependencia(entidadeRelacionada);
        }
    }

    function label(entity, id, field) {
        const item = (cache[entity] || []).find((registro) => {
            return String(registro.id) === String(id);
        });

        if (!item) {
            return "-";
        }

        return item[field] || item.nome || item.email || item.logradouro || `#${id}`;
    }

    function display(entity, row, key) {
        const cfg = schema[entity];

        if (!cfg) {
            return "";
        }

        const field = cfg.fields.find((item) => item[0] === key);

        if (!field) {
            return row[key] ?? "";
        }

        const type = field[2];

        if (type && type.startsWith("rel:")) {
            const [, rel, lab] = type.split(":");
            return label(rel, row[key], lab);
        }

        return row[key] ?? "";
    }

    function inputHtml(field) {
        const [key, label, type] = field;

        if (type === "textarea") {
            return `
                <div class="col-md-12">
                    <label class="form-label">${label}</label>
                    <textarea class="form-control" name="${key}" rows="3"></textarea>
                </div>
            `;
        }

        if (type === "readonly") {
            return `
                <div class="col-md-4">
                    <label class="form-label">${label}</label>
                    <input class="form-control" name="${key}" readonly>
                </div>
            `;
        }

        if (type.startsWith("select:")) {
            const options = type
                .split(":")[1]
                .split("|")
                .map((option) => `<option value="${option}">${option}</option>`)
                .join("");

            return `
                <div class="col-md-6">
                    <label class="form-label">${label}</label>
                    <select class="form-select" name="${key}">
                        ${options}
                    </select>
                </div>
            `;
        }

        if (type.startsWith("rel:")) {
            return `
                <div class="col-md-6">
                    <label class="form-label">${label}</label>
                    <select class="form-select searchable-rel" name="${key}">
                        <option value="">Carregando...</option>
                    </select>
                </div>
            `;
        }

        return `
            <div class="col-md-6">
                <label class="form-label">${label}</label>
                <input class="form-control" name="${key}" type="${type}" required>
            </div>
        `;
    }

    async function buildForm(entity) {
        const formFields = document.getElementById("formFields");

        if (!formFields) {
            return;
        }

        formFields.innerHTML = schema[entity].fields.map(inputHtml).join("");

        await carregarDependenciasDoFormulario(entity);
        populateRelations(entity);
        bindDependencies(entity);
    }

    function populateRelations(entity) {
        const fields = schema[entity].fields;

        const valorPaisAtual = document.querySelector('[name="paisId"]')?.value || "";
        const valorEstadoAtual = document.querySelector('[name="estadoId"]')?.value || "";
        const valorCidadeAtual = document.querySelector('[name="cidadeId"]')?.value || "";
        const valorModeloAtual = document.querySelector('[name="modeloId"]')?.value || "";
        const valorEnderecoAtual = document.querySelector('[name="enderecoId"]')?.value || "";
        const valorInformacaoAtual = document.querySelector('[name="informacaoId"]')?.value || "";

        fields.forEach((field) => {
            const [key, , type] = field;

            if (!type.startsWith("rel:")) {
                return;
            }

            const select = document.querySelector(`[name="${key}"]`);

            if (!select) {
                return;
            }

            const [, relatedEntity, labelField] = type.split(":");

            let registros = cache[relatedEntity] || [];

            if (key === "estadoId") {
                const paisId = document.querySelector('[name="paisId"]')?.value;

                if (paisId) {
                    registros = registros.filter((item) => {
                        return String(item.paisId) === String(paisId);
                    });
                } else {
                    registros = [];
                }
            }

            if (key === "cidadeId") {
                const estadoId = document.querySelector('[name="estadoId"]')?.value;

                if (estadoId) {
                    registros = registros.filter((item) => {
                        return String(item.estadoId) === String(estadoId);
                    });
                } else {
                    registros = [];
                }
            }

            select.innerHTML =
                '<option value="">Selecione...</option>' +
                registros
                    .map((item) => {
                        const texto =
                            item[labelField] ||
                            item.nome ||
                            item.email ||
                            item.logradouro ||
                            item.endereco ||
                            `#${item.id}`;

                        return `<option value="${item.id}">${texto}</option>`;
                    })
                    .join("");

            if (key === "paisId") {
                select.value = valorPaisAtual;
            }

            if (key === "estadoId") {
                select.value = valorEstadoAtual;
            }

            if (key === "cidadeId") {
                select.value = valorCidadeAtual;
            }

            if (key === "modeloId") {
                select.value = valorModeloAtual;
            }

            if (key === "enderecoId") {
                select.value = valorEnderecoAtual;
            }

            if (key === "informacaoId") {
                select.value = valorInformacaoAtual;
            }
        });
    }

    function bindDependencies(entity) {
        const paisSelect = document.querySelector('[name="paisId"]');
        const estadoSelect = document.querySelector('[name="estadoId"]');
        const modeloSelect = document.querySelector('[name="modeloId"]');

        if (paisSelect) {
            paisSelect.onchange = () => {
                const estado = document.querySelector('[name="estadoId"]');
                const cidade = document.querySelector('[name="cidadeId"]');

                if (estado) {
                    estado.value = "";
                }

                if (cidade) {
                    cidade.value = "";
                }

                populateRelations(entity);
            };
        }

        if (estadoSelect) {
            estadoSelect.onchange = () => {
                const cidade = document.querySelector('[name="cidadeId"]');

                if (cidade) {
                    cidade.value = "";
                }

                populateRelations(entity);
            };
        }

        if (modeloSelect) {
            modeloSelect.onchange = () => {
                const modelo = (cache.modelos || []).find((item) => {
                    return String(item.id) === String(modeloSelect.value);
                });

                const marcaInput = document.querySelector('[name="marcaAuto"]');
                const descricaoInput = document.querySelector('[name="descricaoAuto"]');
                const anoInput = document.querySelector('[name="anoAuto"]');

                if (marcaInput) {
                    marcaInput.value = modelo ? modelo.marca || "" : "";
                }

                if (descricaoInput) {
                    descricaoInput.value = modelo ? modelo.descricao || "" : "";
                }

                if (anoInput) {
                    anoInput.value = modelo ? modelo.ano || "" : "";
                }
            };
        }
    }

    function preencherFormulario(entity, rowData) {
        schema[entity].fields.forEach((field) => {
            const key = field[0];
            const input = document.querySelector(`[name="${key}"]`);

            if (input) {
                input.value = rowData[key] ?? "";
            }
        });
    }

    function obterRegistroPorId(entity, id) {
        return (cache[entity] || []).find((item) => {
            return String(item.id) === String(id);
        });
    }

    async function initCrud(entity) {
        initBase();

        const cfg = schema[entity];

        if (!cfg) {
            console.error(`Entidade não encontrada no schema: ${entity}`);
            return;
        }

        const entityTitle = document.getElementById("entityTitle");
        const entityIcon = document.getElementById("entityIcon");

        if (entityTitle) {
            entityTitle.textContent = cfg.title;
        }

        if (entityIcon) {
            entityIcon.className = `fa-solid ${cfg.icon}`;
        }

        await buildForm(entity);

        const table = $("#mainTable").DataTable({
            language: {
                url: "https://cdn.datatables.net/plug-ins/2.0.8/i18n/pt-BR.json"
            },
            responsive: true,
            columns: [
                ...cfg.fields.map((field) => ({
                    title: field[1],
                    data: null,
                    render: (row) => display(entity, row, field[0])
                })),
                {
                    title: "Ações",
                    data: null,
                    orderable: false,
                    render: (row) => `
                        <div class="action-btns">
                            <button class="btn btn-sm btn-outline-info view" data-id="${row.id}" title="Visualizar">
                                <i class="fa fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary edit" data-id="${row.id}" title="Editar">
                                <i class="fa fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger del" data-id="${row.id}" title="Excluir">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    `
                }
            ]
        });

        async function reloadFromApi() {
            try {
                const registros = await buscarApi(entity);

                table.clear();
                table.rows.add(registros || []);
                table.draw();

                console.log(`GET /api/${entity}`, registros);
            } catch (erro) {
                console.error(`Erro ao carregar ${entity}:`, erro);

                Swal.fire({
                    icon: "error",
                    title: "Erro ao carregar dados",
                    text: erro.message
                });
            }
        }

        await reloadFromApi();

        const instantSearch = document.getElementById("instantSearch");
        const loadingSearch = document.getElementById("loadingSearch");

        if (instantSearch) {
            instantSearch.oninput = (event) => {
                if (loadingSearch) {
                    loadingSearch.style.display = "inline";
                }

                setTimeout(() => {
                    table.search(event.target.value).draw();

                    if (loadingSearch) {
                        loadingSearch.style.display = "none";
                    }
                }, 180);
            };
        }

        const btnNovo = document.getElementById("btnNovo");

        if (btnNovo) {
            btnNovo.onclick = async () => {
                const recordId = document.getElementById("recordId");
                const crudForm = document.getElementById("crudForm");
                const modalTitle = document.getElementById("modalTitle");
                const crudModal = document.getElementById("crudModal");

                if (recordId) {
                    recordId.value = "";
                }

                if (crudForm) {
                    crudForm.reset();
                }

                await carregarDependenciasDoFormulario(entity);

                populateRelations(entity);
                bindDependencies(entity);

                if (modalTitle) {
                    modalTitle.textContent = "Novo " + cfg.sing;
                }

                if (crudModal) {
                    const modal = new bootstrap.Modal(crudModal);
                    modal.show();
                }
            };
        }

        const crudForm = document.getElementById("crudForm");

        if (crudForm) {
            crudForm.onsubmit = async (event) => {
                event.preventDefault();

                const obj = Object.fromEntries(new FormData(event.target).entries());
                const payload = montarPayloadApi(obj);

                const recordId = document.getElementById("recordId");
                const id = recordId ? recordId.value : "";

                let url = `/api/${entity}`;
                let method = "POST";

                if (id) {
                    url = `/api/${entity}/${id}`;
                    method = "PUT";
                }

                console.log("Enviando para:", url);
                console.log("Método:", method);
                console.log("Dados enviados:", payload);

                try {
                    const resposta = await fetch(url, {
                        method: method,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    });

                    const resultado = await resposta.json();

                    console.log("Resposta do backend:", resultado);

                    if (!resposta.ok) {
                        throw new Error(resultado.mensagem || "Erro ao salvar registro.");
                    }

                    const modalElement = document.getElementById("crudModal");
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);

                    if (modalInstance) {
                        modalInstance.hide();
                    }

                    await Swal.fire({
                        icon: "success",
                        title: "Registro salvo",
                        text: resultado.mensagem || "Registro salvo no banco de dados."
                    });

                    await reloadFromApi();
                    await carregarDependenciasDoFormulario(entity);

                    populateRelations(entity);
                    bindDependencies(entity);
                } catch (erro) {
                    console.error("Erro ao salvar:", erro);

                    Swal.fire({
                        icon: "error",
                        title: "Erro ao salvar",
                        text: erro.message
                    });
                }
            };
        }

        $("#mainTable").on("click", ".view", function () {
            const id = this.dataset.id;
            const rowData = obterRegistroPorId(entity, id);

            if (!rowData) {
                Swal.fire("Erro", "Não foi possível visualizar o registro.", "error");
                return;
            }

            Swal.fire({
                title: cfg.sing,
                html: cfg.fields
                    .map((field) => {
                        return `<p class="text-start"><b>${field[1]}:</b> ${display(
                            entity,
                            rowData,
                            field[0]
                        )}</p>`;
                    })
                    .join(""),
                icon: "info"
            });
        });

        $("#mainTable").on("click", ".edit", async function () {
            const id = this.dataset.id;
            const rowData = obterRegistroPorId(entity, id);

            if (!rowData) {
                Swal.fire("Erro", "Não foi possível editar o registro.", "error");
                return;
            }

            const recordId = document.getElementById("recordId");

            if (recordId) {
                recordId.value = rowData.id;
            }

            await carregarDependenciasDoFormulario(entity);

            populateRelations(entity);
            preencherFormulario(entity, rowData);

            populateRelations(entity);
            preencherFormulario(entity, rowData);

            bindDependencies(entity);

            if (entity === "veiculos") {
                const modeloSelect = document.querySelector('[name="modeloId"]');

                if (modeloSelect) {
                    modeloSelect.dispatchEvent(new Event("change"));
                }
            }

            const modalTitle = document.getElementById("modalTitle");
            const crudModal = document.getElementById("crudModal");

            if (modalTitle) {
                modalTitle.textContent = "Editar " + cfg.sing;
            }

            if (crudModal) {
                const modal = new bootstrap.Modal(crudModal);
                modal.show();
            }
        });

        $("#mainTable").on("click", ".del", function () {
            const id = this.dataset.id;

            Swal.fire({
                title: "Excluir registro?",
                text: "Essa ação tentará excluir o registro no banco de dados.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sim, excluir",
                cancelButtonText: "Cancelar"
            }).then(async (resultado) => {
                if (!resultado.isConfirmed) {
                    return;
                }

                try {
                    const resposta = await fetch(`/api/${entity}/${id}`, {
                        method: "DELETE"
                    });

                    const dados = await resposta.json();

                    if (!resposta.ok) {
                        throw new Error(dados.mensagem || "Erro ao excluir registro.");
                    }

                    await Swal.fire({
                        icon: "success",
                        title: "Excluído",
                        text: dados.mensagem || "Registro removido com sucesso."
                    });

                    await reloadFromApi();
                    await carregarDependenciasDoFormulario(entity);

                    populateRelations(entity);
                    bindDependencies(entity);
                } catch (erro) {
                    console.error("Erro ao excluir:", erro);

                    Swal.fire({
                        icon: "error",
                        title: "Erro ao excluir",
                        text: erro.message
                    });
                }
            });
        });
    }

    function data() {
        return cache;
    }

    return {
        schema,
        cache,
        data,
        initBase,
        initCrud,
        buscarApi
    };
})();

document.addEventListener("DOMContentLoaded", ERP.initBase);